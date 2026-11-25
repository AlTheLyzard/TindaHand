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
from sqlalchemy.orm import Session

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

    # All sales for this owner
    all_sales = db.query(Sale).filter(Sale.owner_id == owner_id).all()

    # Convert today and month_start to UTC boundaries for safe comparison.
    # Manila is UTC+8, so "today in Manila" starts at UTC 00:00 - 8h = previous day 16:00 UTC.
    today_start_utc = datetime(today.year, today.month, today.day, tzinfo=timezone.utc) - MANILA_OFFSET
    today_end_utc   = today_start_utc + timedelta(days=1)
    # Week starts on Monday in Manila time
    week_start_manila = today - timedelta(days=today.weekday())
    week_start_utc  = datetime(week_start_manila.year, week_start_manila.month, week_start_manila.day, tzinfo=timezone.utc) - MANILA_OFFSET
    month_start_utc = datetime(month_start.year, month_start.month, month_start.day, tzinfo=timezone.utc) - MANILA_OFFSET

    def _utc(dt: datetime) -> datetime:
        """Return dt as UTC-aware, handling both naive (assume UTC) and aware datetimes."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    # Helper: amount actually received for a sale (total minus any unpaid remainder).
    # This matches what Transaction History shows and what the customer actually paid.
    def _received(s) -> int:
        return s.total_centavos - s.remaining_centavos

    # Today's sales (Manila time) — sum of amounts actually received
    today_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if today_start_utc <= _utc(s.occurred_at) < today_end_utc
    )

    # This week's sales (Monday–Sunday, Manila time)
    week_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if _utc(s.occurred_at) >= week_start_utc
    )

    # This month's sales
    month_sales_centavos = sum(
        _received(s)
        for s in all_sales
        if _utc(s.occurred_at) >= month_start_utc
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
    cash_asset = (
        db.query(Asset)
        .filter(
            Asset.owner_id == owner_id,
            Asset.classification == "current",
            Asset.is_deleted == False,
        )
        .first()
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
    initial_capital = cash_asset.value_centavos if cash_asset else 0
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
