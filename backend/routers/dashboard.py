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
from models import Sale, SaleLine, CustomerDebt, StoreDebt, StoreDebtPayment, CashMovement, Asset
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
    month_start_utc = datetime(month_start.year, month_start.month, month_start.day, tzinfo=timezone.utc) - MANILA_OFFSET

    def _utc(dt: datetime) -> datetime:
        """Return dt as UTC-aware, handling both naive (assume UTC) and aware datetimes."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    # Today's sales (Manila time)
    today_sales_centavos = sum(
        s.total_centavos
        for s in all_sales
        if today_start_utc <= _utc(s.occurred_at) < today_end_utc
    )

    # This month's sales
    month_sales_centavos = sum(
        s.total_centavos
        for s in all_sales
        if _utc(s.occurred_at) >= month_start_utc
    )

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
    # Cash inflows from cash tenders in sales, minus cash change given
    cash_sales = sum(
        sum(t.received_centavos for t in s.tenders if t.method == "cash")
        - max(0, sum(t.received_centavos for t in s.tenders if t.method == "cash")
              - (s.total_centavos - sum(t.received_centavos for t in s.tenders if t.method == "gcash")))
        for s in all_sales
    )
    # Manual cash movements (additions)
    cash_movements = db.query(CashMovement).filter(CashMovement.owner_id == owner_id).all()
    cash_added = sum(m.amount_centavos for m in cash_movements)

    # Base cash: initial Cash on Hand asset value + movements + sales
    base_cash = (cash_asset.value_centavos if cash_asset else 0) + cash_added + cash_sales

    # Top products by revenue (Max-Heap Top-K)
    all_lines = []
    for sale in all_sales:
        all_lines.extend(sale.lines)
    top_products = top_k_products(all_lines, k=top_k)

    return DashboardSummary(
        cashBalanceCentavos=base_cash,
        totalSalesTodayCentavos=today_sales_centavos,
        totalSalesThisMonthCentavos=month_sales_centavos,
        totalReceivablesCentavos=receivables_centavos,
        totalPayablesCentavos=payables_centavos,
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
