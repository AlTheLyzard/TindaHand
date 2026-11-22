"""
Receivables router — customer debts and their payments (Accounts Receivable).
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import CustomerDebt, CustomerDebtLine, DebtPayment, Customer
from schemas import (
    CustomerDebtOut, CustomerDebtCreate,
    ReceivablePaymentOut, ReceivablePaymentCreate,
    OkResponse,
)

router = APIRouter(prefix="/receivables", tags=["receivables"])


def _debt_to_out(d: CustomerDebt, owner_db_id: int) -> CustomerDebtOut:
    paid_centavos = sum(p.amount_centavos for p in d.payments)
    # Reconstruct ProductSelection dict from stored lines (empty dict for cash debts)
    items = {
        line.product_id or str(line.id): {
            "productId": line.product_id or str(line.id),
            "itemName": line.item_name,
            "unitPriceCentavos": line.unit_price_centavos,
            "quantity": line.quantity,
        }
        for line in d.lines
    } if d.lines else None
    return CustomerDebtOut(
        id=d.id,
        ownerId=f"TH-MA-{owner_db_id:04d}",
        customerId=d.customer_id,
        saleId=d.sale_id,
        name=d.name,
        originalAmountCentavos=d.original_amount_centavos,
        amountCentavos=d.amount_centavos,
        paidCentavos=paid_centavos,
        borrowing=d.borrowing.value if d.borrowing else None,
        items=items,
        dueDate=d.due_date,
        details=d.details,
        paymentStatus=d.payment_status.value,
        occurredAt=d.occurred_at.isoformat(),
    )


# ── DEBTS ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CustomerDebtOut])
def list_debts(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    debts = (
        db.query(CustomerDebt)
        .filter(CustomerDebt.owner_id == owner_id)
        .order_by(CustomerDebt.occurred_at.desc())
        .all()
    )
    return [_debt_to_out(d, owner_id) for d in debts]


@router.post("", response_model=CustomerDebtOut, status_code=201)
def create_debt(
    body: CustomerDebtCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))

    # Find or create a Customer record so the name appears in the customer picker
    # on future debts and links multiple debts to the same person.
    customer_name = body.name.strip()
    customer_id = body.customerId
    if not customer_id:
        existing = (
            db.query(Customer)
            .filter(Customer.owner_id == owner_id, Customer.name == customer_name)
            .first()
        )
        if existing:
            customer_id = existing.id
        else:
            new_customer = Customer(
                id=f"cust-{uuid.uuid4().hex[:10]}",
                owner_id=owner_id,
                name=customer_name,
            )
            db.add(new_customer)
            db.flush()
            customer_id = new_customer.id

    debt = CustomerDebt(
        id=f"debt-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        customer_id=customer_id,
        sale_id=None,
        name=customer_name,
        original_amount_centavos=body.amountCentavos,
        amount_centavos=body.amountCentavos,
        borrowing=body.borrowing,
        due_date=body.dueDate,
        details=body.details,
        payment_status="unpaid",
        occurred_at=occurred_at,
    )
    db.add(debt)
    db.flush()  # get debt.id before inserting lines

    # Persist product line items for product-borrowing debts
    if body.borrowing == "product" and body.items:
        for line in body.items.values():
            db.add(CustomerDebtLine(
                debt_id=debt.id,
                product_id=line.productId if line.productId else None,
                item_name=line.itemName,
                unit_price_centavos=line.unitPriceCentavos,
                quantity=line.quantity,
            ))

    db.commit()
    db.refresh(debt)
    return _debt_to_out(debt, owner_id)


# ── PAYMENTS ─────────────────────────────────────────────────────────────────

@router.get("/payments", response_model=List[ReceivablePaymentOut])
def list_payments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    payments = (
        db.query(DebtPayment)
        .filter(DebtPayment.owner_id == owner_id)
        .order_by(DebtPayment.occurred_at.desc())
        .all()
    )
    return [
        ReceivablePaymentOut(
            id=p.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            debtId=p.debt_id,
            amountCentavos=p.amount_centavos,
            reference=p.reference,
            occurredAt=p.occurred_at.isoformat(),
        )
        for p in payments
    ]


@router.post("/payments", response_model=ReceivablePaymentOut, status_code=201)
def record_payment(
    body: ReceivablePaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]

    debt = db.query(CustomerDebt).filter(
        CustomerDebt.id == body.debtId,
        CustomerDebt.owner_id == owner_id,
    ).first()
    if not debt:
        raise HTTPException(404, "Debt not found")
    if debt.amount_centavos <= 0:
        raise HTTPException(422, "Debt is already fully paid")
    if body.amountCentavos <= 0:
        raise HTTPException(422, "Payment amount must be positive")
    if body.amountCentavos > debt.amount_centavos:
        raise HTTPException(422, "Payment exceeds remaining balance")

    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))

    payment = DebtPayment(
        id=f"payment-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        debt_id=body.debtId,
        amount_centavos=body.amountCentavos,
        reference=body.reference,
        occurred_at=occurred_at,
    )
    db.add(payment)

    # Update debt balance
    debt.amount_centavos -= body.amountCentavos
    if debt.amount_centavos <= 0:
        debt.amount_centavos = 0
        debt.payment_status = "paid"
    else:
        debt.payment_status = "partial"

    db.commit()
    db.refresh(payment)

    return ReceivablePaymentOut(
        id=payment.id,
        ownerId=f"TH-MA-{owner_id:04d}",
        debtId=payment.debt_id,
        amountCentavos=payment.amount_centavos,
        reference=payment.reference,
        occurredAt=payment.occurred_at.isoformat(),
    )
