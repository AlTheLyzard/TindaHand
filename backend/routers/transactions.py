"""
Transactions router — read-only log of all money movement.

The transaction log is built from three sources:
  - Sales (money in)
  - Customer debt payments / AR collections (money in)
  - Expenses (money out)

No separate Transaction table: we project on the fly from the source tables,
exactly like the frontend's projectTransactions() utility does it.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import Sale, CustomerDebt, DebtPayment, Expense, StoreDebt, StoreDebtPayment
from schemas import TransactionOut

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _is_initial_sale_receipt(payment: DebtPayment, debts: List[CustomerDebt], sales: List[Sale]) -> bool:
    """
    Mirrors the frontend's isInitialSaleReceipt() logic.
    The initial partial payment on a POS sale is already captured in the sale itself,
    so it must not be counted again as a separate AR collection.
    """
    debt = next((d for d in debts if d.id == payment.debt_id and d.owner_id == payment.owner_id), None)
    if not debt or not debt.sale_id:
        return False
    return payment.id == f"initial-payment-{debt.sale_id}" and any(
        s.id == debt.sale_id and s.owner_id == payment.owner_id for s in sales
    )


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    from_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    to_date:   Optional[str] = Query(None, description="YYYY-MM-DD"),
    type:      Optional[str] = Query(None, description="sale | customerPayment | expense"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]

    sales             = db.query(Sale).filter(Sale.owner_id == owner_id).all()
    debts             = db.query(CustomerDebt).filter(CustomerDebt.owner_id == owner_id).all()
    payments          = db.query(DebtPayment).filter(DebtPayment.owner_id == owner_id).all()
    expenses          = db.query(Expense).filter(Expense.owner_id == owner_id).all()
    store_debts       = db.query(StoreDebt).filter(StoreDebt.owner_id == owner_id).all()
    store_debt_payments = db.query(StoreDebtPayment).filter(StoreDebtPayment.owner_id == owner_id).all()

    rows: List[TransactionOut] = []

    # 1. Sales
    for sale in sales:
        received = min(
            sale.total_centavos,
            sum(t.received_centavos for t in sale.tenders),
        )
        methods = list({t.method for t in sale.tenders if t.received_centavos > 0})
        pm = "split" if len(methods) > 1 else (methods[0] if methods else None)

        debt = next((d for d in debts if d.sale_id == sale.id), None)
        party = sale.customer.name if sale.customer_id else (debt.name if debt else None)

        rows.append(TransactionOut(
            id=f"sale:{sale.id}",
            sourceId=sale.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=sale.id,
            type="sale",
            occurredAt=sale.occurred_at.isoformat(),
            description=f"POS Sale #{sale.id}",
            partyName=party,
            paymentMethod=pm,
            amountCentavos=received,
            direction="in" if received > 0 else "neutral",
            saleId=sale.id,
            debtId=debt.id if debt else None,
            saleTotalCentavos=sale.total_centavos,
            amountReceivedCentavos=received,
            outstandingCentavos=sale.remaining_centavos,
        ))

    # 2. AR collections (skip initial POS receipt mirror)
    for payment in payments:
        if _is_initial_sale_receipt(payment, debts, sales):
            continue
        debt = next((d for d in debts if d.id == payment.debt_id and d.owner_id == owner_id), None)
        rows.append(TransactionOut(
            id=f"collection:{payment.id}",
            sourceId=payment.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=payment.id,
            type="customerPayment",
            occurredAt=payment.occurred_at.isoformat(),
            description="Customer Payment",
            partyName=debt.name if debt else None,
            paymentMethod=None,
            amountCentavos=payment.amount_centavos,
            direction="in",
            debtId=payment.debt_id,
            saleId=debt.sale_id if debt else None,
        ))

    # 3. Expenses
    for expense in expenses:
        rows.append(TransactionOut(
            id=f"expense:{expense.id}",
            sourceId=expense.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=expense.id,
            type="expense",
            occurredAt=expense.occurred_at.isoformat(),
            description=f"Store Expense — {expense.details or expense.name}",
            partyName=expense.name or None,
            paymentMethod=None,
            amountCentavos=expense.amount_centavos,
            direction="out",
        ))

    # 4. Customer debts created via Quick Add (skip POS-originated debts — already in the sale row)
    for debt in debts:
        if debt.sale_id:
            continue  # already captured in the sale row
        rows.append(TransactionOut(
            id=f"customerDebt:{debt.id}",
            sourceId=debt.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=debt.id,
            type="customerDebt",
            occurredAt=debt.occurred_at.isoformat(),
            description=f"Customer Debt — {debt.name}",
            partyName=debt.name,
            paymentMethod=None,
            amountCentavos=debt.original_amount_centavos,
            direction="out",
            debtId=debt.id,
        ))

    # 5. Store debts (money owed to suppliers — recorded when debt is created)
    for sd in store_debts:
        rows.append(TransactionOut(
            id=f"storeDebt:{sd.id}",
            sourceId=sd.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=sd.id,
            type="storeDebt",
            occurredAt=sd.occurred_at.isoformat(),
            description=f"Store Debt — {sd.name}",
            partyName=sd.name,
            paymentMethod=None,
            amountCentavos=sd.original_amount_centavos,
            direction="out",
            debtId=sd.id,
        ))

    # 6. Store debt payments (money out to suppliers)
    store_debt_map = {sd.id: sd for sd in store_debts}
    for sdp in store_debt_payments:
        sd = store_debt_map.get(sdp.debt_id)
        rows.append(TransactionOut(
            id=f"storeDebtPayment:{sdp.id}",
            sourceId=sdp.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            transactionNumber=sdp.id,
            type="supplierPayment",
            occurredAt=sdp.occurred_at.isoformat(),
            description=f"Store Debt Payment — {sd.name if sd else 'Supplier'}",
            partyName=sd.name if sd else None,
            paymentMethod=None,
            amountCentavos=sdp.amount_centavos,
            direction="out",
            debtId=sdp.debt_id,
        ))

    # Filter by type
    if type and type != "all":
        rows = [r for r in rows if r.type == type]

    # Filter by date range (Asia/Manila naive comparison on date portion)
    if from_date:
        rows = [r for r in rows if r.occurredAt[:10] >= from_date]
    if to_date:
        rows = [r for r in rows if r.occurredAt[:10] <= to_date]

    # Sort newest first
    rows.sort(key=lambda r: r.occurredAt, reverse=True)

    return rows[:limit]
