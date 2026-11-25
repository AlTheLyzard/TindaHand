"""
Financial router — journal entries derived from real database records.

GET /financial/journal
  Returns double-entry journal entries built from all stored transactions
  (sales, AR collections, expenses, restocks, store debts, store debt payments)
  filtered to the owner's store and optionally to a date range.

The journal entry format matches the frontend's JournalEntry type:
  { id, date, description, lines: [{ accountId, debit, credit }] }

Account IDs match the chart of accounts in src/data/financial.ts:
  cash, receivables, inventory, equipment, payables, capital,
  sales, cogs, utilities, transport, expense
"""

from datetime import timezone as tz
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import require_role
from models import (
    Sale, SaleLine, CustomerDebt, DebtPayment,
    Expense, StoreDebt, StoreDebtPayment, Restock,
)
from schemas import JournalEntryOut

router = APIRouter(prefix="/financial", tags=["financial"])

MANILA_TZ_OFFSET = 8  # UTC+8


def _manila_date(dt) -> str:
    """Convert a timezone-aware datetime to Asia/Manila YYYY-MM-DD."""
    if dt is None:
        return ""
    # shift to UTC+8
    import datetime
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz.utc)
    manila = dt.astimezone(datetime.timezone(datetime.timedelta(hours=MANILA_TZ_OFFSET)))
    return manila.strftime("%Y-%m-%d")


def _lines(*pairs):
    """Build journal lines from (accountId, debit, credit) tuples."""
    return [{"accountId": a, "debit": d, "credit": c} for a, d, c in pairs]


@router.get("/journal", response_model=List[JournalEntryOut])
def get_journal(
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD (Asia/Manila)"),
    to_date: Optional[str] = Query(None, description="YYYY-MM-DD (Asia/Manila)"),
    db: Session = Depends(get_db),
    current_user=Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    entries: List[JournalEntryOut] = []

    # ── 1. Sales ─────────────────────────────────────────────────────────────
    sales = db.query(Sale).filter(Sale.owner_id == owner_id).all()
    debts = db.query(CustomerDebt).filter(CustomerDebt.owner_id == owner_id).all()
    debt_by_sale = {d.sale_id: d for d in debts if d.sale_id}

    for sale in sales:
        date = _manila_date(sale.occurred_at)
        cash_received = min(
            sale.total_centavos,
            sum(t.received_centavos for t in sale.tenders),
        ) - getattr(sale, "cash_change_centavos", 0)
        # cash_change is not stored directly — compute from tenders vs total
        total_tendered = sum(t.received_centavos for t in sale.tenders)
        change = max(0, total_tendered - sale.total_centavos)
        cash_received = total_tendered - change
        on_credit = sale.remaining_centavos

        # Revenue entry
        rev_lines = []
        if cash_received > 0:
            rev_lines.append({"accountId": "cash", "debit": cash_received, "credit": 0})
        if on_credit > 0:
            rev_lines.append({"accountId": "receivables", "debit": on_credit, "credit": 0})
        rev_lines.append({"accountId": "sales", "debit": 0, "credit": cash_received + on_credit})

        entries.append(JournalEntryOut(
            id=f"sale-{sale.id}",
            date=date,
            description=f"POS Sale #{sale.id}",
            lines=rev_lines,
        ))

        # COGS entry — sum cost from product records (via relationship)
        cogs = sum(
            (line.product.cost_centavos if line.product else 0) * line.quantity
            for line in sale.lines
        )
        if cogs > 0:
            entries.append(JournalEntryOut(
                id=f"cogs-{sale.id}",
                date=date,
                description=f"Cost of sale #{sale.id}",
                lines=_lines(("cogs", cogs, 0), ("inventory", 0, cogs)),
            ))

    # ── 2. AR collections (skip initial POS receipt mirror) ──────────────────
    payments = db.query(DebtPayment).filter(DebtPayment.owner_id == owner_id).all()
    for payment in payments:
        debt = next((d for d in debts if d.id == payment.debt_id), None)
        # Skip the initial payment that mirrors the POS sale receipt
        if debt and debt.sale_id and payment.id == f"initial-payment-{debt.sale_id}":
            continue
        date = _manila_date(payment.occurred_at)
        name = debt.name if debt else "Customer"
        entries.append(JournalEntryOut(
            id=f"recv-{payment.id}",
            date=date,
            description=f"Customer payment — {name}",
            lines=_lines(
                ("cash", payment.amount_centavos, 0),
                ("receivables", 0, payment.amount_centavos),
            ),
        ))

    # ── 3. Expenses ───────────────────────────────────────────────────────────
    expenses = db.query(Expense).filter(Expense.owner_id == owner_id).all()
    for expense in expenses:
        date = _manila_date(expense.occurred_at)
        cat = (expense.category or "").lower()
        if "electric" in cat or "water" in cat or "util" in cat:
            account = "utilities"
        elif "transport" in cat or "delivery" in cat or "freight" in cat:
            account = "transport"
        else:
            account = "expense"
        entries.append(JournalEntryOut(
            id=f"expense-{expense.id}",
            date=date,
            description=f"Expense — {expense.name or expense.details or 'Store expense'}",
            lines=_lines(
                (account, expense.amount_centavos, 0),
                ("cash", 0, expense.amount_centavos),
            ),
        ))

    # ── 4. Restocks (inventory purchases for cash) ───────────────────────────
    restocks = db.query(Restock).filter(Restock.owner_id == owner_id).all()
    for restock in restocks:
        cost = restock.cost_centavos
        if not cost or cost <= 0:
            continue
        # Restock uses stock_date (YYYY-MM-DD string), not a datetime
        date = restock.stock_date
        entries.append(JournalEntryOut(
            id=f"restock-{restock.id}",
            date=date,
            description=f"Restock — {restock.item_name}",
            lines=_lines(
                ("inventory", cost, 0),
                ("cash", 0, cost),
            ),
        ))

    # ── 5. Store debts (bought on credit — debit inventory, credit payables) ─
    store_debts = db.query(StoreDebt).filter(StoreDebt.owner_id == owner_id).all()
    for sd in store_debts:
        date = _manila_date(sd.occurred_at)
        entries.append(JournalEntryOut(
            id=f"storedebt-{sd.id}",
            date=date,
            description=f"Purchased on credit — {sd.name}",
            lines=_lines(
                ("inventory", sd.original_amount_centavos, 0),
                ("payables", 0, sd.original_amount_centavos),
            ),
        ))

    # ── 6. Store debt payments (paid supplier — debit payables, credit cash) ─
    sdps = db.query(StoreDebtPayment).filter(StoreDebtPayment.owner_id == owner_id).all()
    sd_map = {sd.id: sd for sd in store_debts}
    for sdp in sdps:
        sd = sd_map.get(sdp.debt_id)
        date = _manila_date(sdp.occurred_at)
        entries.append(JournalEntryOut(
            id=f"sdp-{sdp.id}",
            date=date,
            description=f"Supplier payment — {sd.name if sd else 'Supplier'}",
            lines=_lines(
                ("payables", sdp.amount_centavos, 0),
                ("cash", 0, sdp.amount_centavos),
            ),
        ))

    # ── Filter by date range ─────────────────────────────────────────────────
    if from_date:
        entries = [e for e in entries if e.date >= from_date]
    if to_date:
        entries = [e for e in entries if e.date <= to_date]

    # Sort by date ascending (journal order)
    entries.sort(key=lambda e: (e.date, e.id))
    return entries
