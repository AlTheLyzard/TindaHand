"""
Dashboard router — summary numbers, cash movements, top products.

Max-Heap Top-K lives here:
  GET /dashboard returns the top-N best-selling products by revenue.
  We build a max-heap from all products that have sales this period,
  then pop the top K.  This runs in O(n log K) instead of O(n log n)
  for a full sort — efficient when K is small (5) and products are many.
"""

import heapq
import uuid
from datetime import datetime, date, timezone, timedelta
from typing import List, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from auth import get_current_user, require_role
from models import Sale, SaleLine, CustomerDebt, StoreDebt, StoreDebtPayment, CashMovement, Asset, Expense, DebtPayment, Restock
from schemas import (
    DashboardSummary, TopProduct,
    CashMovementOut, CashMovementCreate,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MANILA_OFFSET = timedelta(hours=8)   # Asia/Manila = UTC+8


def _manila_today() -> date:
    return (datetime.now(timezone.utc) + MANILA_OFFSET).date()


def _manila_month_start() -> date:
    today = _manila_today()
    return today.replace(day=1)


# ── Max-Heap Top-K ────────────────────────────────────────────────────────────

def top_k_products(sale_lines: List[SaleLine], k: int = 5) -> List[TopProduct]:
    """
    Returns the top-K products by revenue using a Max-Heap.

    Why a max-heap instead of just sorting?
    With a max-heap we pay O(n log K) to find the top K, not O(n log n) for
    sorting everything.  When you have hundreds of products and only want the
    top 5, that's faster.  Python's heapq is a MIN-heap, so we negate the
    revenue to simulate a max-heap.

    Steps:
    1. Aggregate revenue and quantity per product across all sale lines.
    2. Push each product onto the heap with key = -revenue (negated so the
       highest revenue sits at the heap top after negating back).
    3. Pop k times to get the top k.
    """
    # Aggregate by product
    agg: Dict[str, Dict] = {}
    for line in sale_lines:
        pid = line.product_id or line.item_name
        if pid not in agg:
            agg[pid] = {
                "productId": pid,
                "name": line.item_name,
                "quantitySold": 0,
                "revenueCentavos": 0,
            }
        agg[pid]["quantitySold"]   += line.quantity
        agg[pid]["revenueCentavos"] += line.unit_price_centavos * line.quantity

    if not agg:
        return []

    # Build max-heap (negate revenue so heapq min-heap acts as max-heap)
    heap = []
    for entry in agg.values():
        heapq.heappush(heap, (-entry["revenueCentavos"], entry["productId"], entry))

    results: List[TopProduct] = []
    for _ in range(min(k, len(heap))):
        _, _, entry = heapq.heappop(heap)
        results.append(TopProduct(
            productId=entry["productId"],
            name=entry["name"],
            quantitySold=entry["quantitySold"],
            revenueCentavos=entry["revenueCentavos"],
        ))

    return results


# ── DASHBOARD SUMMARY ────────────────────────────────────────────────────────

@router.get("", response_model=DashboardSummary)
def dashboard_summary(
    top_k: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id   = current_user["db_id"]
    today      = _manila_today()
    month_start = _manila_month_start()

    # All sales for this owner — eager-load lines so top_k_products works without N+1 queries
    all_sales = (
        db.query(Sale)
        .filter(Sale.owner_id == owner_id)
        .options(joinedload(Sale.lines))
        .all()
    )

    # TIMEZONE STRATEGY
    # -----------------
    # DB has mixed timestamp formats due to evolution:
    #   • Old sales (pre-fix): stored as naive Manila local time (e.g. '2026-11-22 12:49:06')
    #     because the column was DateTime (no timezone) and old code passed Manila time strings.
    #     PostgreSQL treats naive values as UTC on Railway, but the wall-clock value IS Manila.
    #   • New sales (post-fix): stored as UTC-aware (e.g. '2026-11-25 20:58:00+00:00')
    #     because current code converts ISO 'Z' strings correctly.
    #
    # Solution: compare in Python after normalizing both sides to Manila local naive datetimes.
    # This avoids PostgreSQL timezone confusion entirely.
    week_start_manila = today - timedelta(days=today.weekday())

    def _received(s) -> int:
        return s.total_centavos - s.remaining_centavos

    def _to_manila_naive(dt: datetime) -> datetime:
        """
        Convert any occurred_at value to Manila local time as a naive datetime,
        so period comparisons work regardless of how the value was originally stored.

        • Timezone-aware (UTC): convert to Manila by adding +8h, strip tzinfo.
        • Naive (old rows stored as Manila local): treat as already Manila, return as-is.
          This is correct because those old rows were inserted as Manila wall-clock time.
        """
        if dt.tzinfo is not None:
            # UTC-aware → convert to Manila local → strip tz
            return (dt.astimezone(timezone.utc) + MANILA_OFFSET).replace(tzinfo=None)
        # Naive → already Manila local wall-clock time
        return dt

    today_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if date(today.year, today.month, today.day)
        <= _to_manila_naive(s.occurred_at).date()
        < date(today.year, today.month, today.day) + timedelta(days=1)
    )

    week_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if _to_manila_naive(s.occurred_at).date() >= week_start_manila
    )

    month_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if _to_manila_naive(s.occurred_at).date() >= month_start
    )

    # All-time sales total (for Money In)
    all_time_sales_centavos = sum(_received(s) for s in all_sales)

    # Total outstanding receivables (what customers owe us)
    receivables_centavos = sum(
        d.amount_centavos
        for d in db.query(CustomerDebt)
        .filter(
            CustomerDebt.owner_id == owner_id,
            CustomerDebt.payment_status != "paid",
        )
        .all()
    )

    # Total outstanding payables (what we owe suppliers)
    all_store_debts = db.query(StoreDebt).filter(StoreDebt.owner_id == owner_id).all()
    payables_centavos = 0
    for sd in all_store_debts:
        paid = sum(p.amount_centavos for p in sd.payments)
        remaining = sd.original_amount_centavos - paid
        if remaining > 0:
            payables_centavos += remaining

    # Cash balance = current asset value from Assets table (Cash on Hand)
    # Sum ALL current assets as initial capital — each one is a form of starting
    # capital (Cash On Hand, Investment, Lotto winnings, etc.) that the owner
    # declared before the store started operating.
    current_assets = (
        db.query(Asset)
        .filter(
            Asset.owner_id == owner_id,
            Asset.classification == "current",
            Asset.is_deleted == False,
        )
        .all()
    )
    # ── PERA SA KAHA = Cash account in the general journal ────────────────────
    # Cash is DEBITED (dagdag) by:
    #   • Sales received in cash/GCash (amount actually collected, not utang portion)
    #   • Customer debt payments received (bayad sa utang)
    #   • Manual cash additions (puhunan, deposito, etc.)
    #   • Initial capital (asset value on record)
    #
    # Cash is CREDITED (bawas) by:
    #   • Expenses (kuryente, water, supplies, etc.)
    #   • Store debt payments made to suppliers/creditors (bayad sa 5-6, etc.)
    #
    # Note: Inventory restocks are NOT subtracted here because the Restock model
    # only tracks quantity, not purchase cost. If a cost field is added later,
    # subtract it here as cash out.

    # Cash IN: sales received (excludes the still-unpaid utang portion of credit sales)
    cash_sales = sum(s.total_centavos - s.remaining_centavos for s in all_sales)

    # Cash IN: customer debt payments received (bayad sa utang — debit Cash, credit AR)
    all_debt_payments = db.query(DebtPayment).filter(DebtPayment.owner_id == owner_id).all()
    cash_from_debt_payments = sum(p.amount_centavos for p in all_debt_payments)

    # Cash IN: manual cash additions (puhunan, etc.)
    cash_movements = db.query(CashMovement).filter(CashMovement.owner_id == owner_id).all()
    cash_added = sum(m.amount_centavos for m in cash_movements)

    # Cash OUT: expenses (kuryente, water, operating costs — credit Cash)
    all_expenses = db.query(Expense).filter(Expense.owner_id == owner_id).all()
    total_expenses_centavos = sum(e.amount_centavos for e in all_expenses)

    # Cash OUT: store debt payments made (bayad sa supplier/5-6 — credit Cash)
    all_store_debt_payments = db.query(StoreDebtPayment).filter(
        StoreDebtPayment.owner_id == owner_id
    ).all()
    total_store_debt_payments_centavos = sum(p.amount_centavos for p in all_store_debt_payments)

    # Cash OUT: inventory purchase costs (paninda restock — credit Cash)
    #   Only counted when cost_centavos was recorded (nullable; older restocks without cost = 0).
    all_restocks = db.query(Restock).filter(Restock.owner_id == owner_id).all()
    total_restock_costs_centavos = sum(r.cost_centavos for r in all_restocks if r.cost_centavos is not None)

    # Pera sa Kaha = all Cash debits minus all Cash credits
    initial_capital = sum(a.value_centavos for a in current_assets)
    cash_balance = (
        initial_capital
        + cash_sales
        + cash_from_debt_payments
        + cash_added
        - total_expenses_centavos
        - total_store_debt_payments_centavos
        - total_restock_costs_centavos
    )

    # Money Out shown on dashboard = expenses + store debt payments + restock costs
    total_money_out_centavos = total_expenses_centavos + total_store_debt_payments_centavos + total_restock_costs_centavos

    # ── Period-scoped expense totals (mirror the sales period logic) ─────────
    # Uses the same _to_manila_naive() helper so old naive rows and new UTC-aware
    # rows are both compared correctly against Asia/Manila day/week/month bounds.

    def _expense_in_period(e) -> int:
        """Return e.amount_centavos when occurred_at falls in today (Manila), else 0."""
        if not hasattr(e, 'occurred_at') or e.occurred_at is None:
            return 0
        d = _to_manila_naive(e.occurred_at).date()
        return e.amount_centavos if d == today else 0

    def _restock_in_period(r, start: date) -> int:
        if not hasattr(r, 'occurred_at') or r.occurred_at is None or r.cost_centavos is None:
            return 0
        d = _to_manila_naive(r.occurred_at).date()
        return r.cost_centavos if d >= start else 0

    def _sdp_in_period(p, start: date) -> int:
        if not hasattr(p, 'occurred_at') or p.occurred_at is None:
            return 0
        d = _to_manila_naive(p.occurred_at).date()
        return p.amount_centavos if d >= start else 0

    # Expenses today
    expenses_today = sum(
        e.amount_centavos for e in all_expenses
        if e.occurred_at is not None and _to_manila_naive(e.occurred_at).date() == today
    )
    sdp_today = sum(
        p.amount_centavos for p in all_store_debt_payments
        if hasattr(p, 'occurred_at') and p.occurred_at is not None
        and _to_manila_naive(p.occurred_at).date() == today
    )
    restock_today = sum(
        r.cost_centavos for r in all_restocks
        if r.cost_centavos is not None and hasattr(r, 'occurred_at')
        and r.occurred_at is not None
        and _to_manila_naive(r.occurred_at).date() == today
    )
    total_expenses_today_centavos = expenses_today + sdp_today + restock_today

    # Expenses this week (Mon – now, Manila)
    expenses_week = sum(
        e.amount_centavos for e in all_expenses
        if e.occurred_at is not None and _to_manila_naive(e.occurred_at).date() >= week_start_manila
    )
    sdp_week = sum(
        p.amount_centavos for p in all_store_debt_payments
        if hasattr(p, 'occurred_at') and p.occurred_at is not None
        and _to_manila_naive(p.occurred_at).date() >= week_start_manila
    )
    restock_week = sum(
        r.cost_centavos for r in all_restocks
        if r.cost_centavos is not None and hasattr(r, 'occurred_at')
        and r.occurred_at is not None
        and _to_manila_naive(r.occurred_at).date() >= week_start_manila
    )
    total_expenses_this_week_centavos = expenses_week + sdp_week + restock_week

    # Expenses this month (1st – now, Manila)
    expenses_month = sum(
        e.amount_centavos for e in all_expenses
        if e.occurred_at is not None and _to_manila_naive(e.occurred_at).date() >= month_start
    )
    sdp_month = sum(
        p.amount_centavos for p in all_store_debt_payments
        if hasattr(p, 'occurred_at') and p.occurred_at is not None
        and _to_manila_naive(p.occurred_at).date() >= month_start
    )
    restock_month = sum(
        r.cost_centavos for r in all_restocks
        if r.cost_centavos is not None and hasattr(r, 'occurred_at')
        and r.occurred_at is not None
        and _to_manila_naive(r.occurred_at).date() >= month_start
    )
    total_expenses_this_month_centavos = expenses_month + sdp_month + restock_month

    # Top products by revenue (Max-Heap Top-K)
    all_lines = []
    for sale in all_sales:
        all_lines.extend(sale.lines)
    top_products = top_k_products(all_lines, k=top_k)

    return DashboardSummary(
        cashBalanceCentavos=cash_balance,
        totalSalesTodayCentavos=today_sales_centavos,
        totalSalesThisWeekCentavos=week_sales_centavos,
        totalSalesThisMonthCentavos=month_sales_centavos,
        totalSalesCentavos=all_time_sales_centavos,
        totalReceivablesCentavos=receivables_centavos,
        totalPayablesCentavos=payables_centavos,
        totalMoneyOutCentavos=total_money_out_centavos,
        totalExpensesTodayCentavos=total_expenses_today_centavos,
        totalExpensesThisWeekCentavos=total_expenses_this_week_centavos,
        totalExpensesThisMonthCentavos=total_expenses_this_month_centavos,
        topProducts=top_products,
    )


# ── CASH MOVEMENTS ───────────────────────────────────────────────────────────

@router.get("/cash-movements", response_model=List[CashMovementOut])
def list_cash_movements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    movements = (
        db.query(CashMovement)
        .filter(CashMovement.owner_id == owner_id)
        .order_by(CashMovement.occurred_at.desc())
        .all()
    )
    return [
        CashMovementOut(
            id=m.id,
            amountCentavos=m.amount_centavos,
            occurredAt=m.occurred_at.isoformat(),
        )
        for m in movements
    ]


@router.post("/cash-movements", response_model=CashMovementOut, status_code=201)
def add_cash_movement(
    body: CashMovementCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    if body.amountCentavos <= 0:
        from fastapi import HTTPException
        raise HTTPException(422, "Cash amount must be positive")
    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))
    movement = CashMovement(
        id=f"cash-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        amount_centavos=body.amountCentavos,
        occurred_at=occurred_at,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return CashMovementOut(
        id=movement.id,
        amountCentavos=movement.amount_centavos,
        occurredAt=movement.occurred_at.isoformat(),
    )
