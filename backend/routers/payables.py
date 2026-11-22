"""
Payables router — store creditors, store debts and their payments (Accounts Payable).
"""

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import StoreCreditor, StoreDebt, StoreDebtPayment
from schemas import (
    CreditorOut, CreditorCreate,
    StoreDebtOut, StoreDebtCreate,
    StoreDebtPaymentOut, StoreDebtPaymentCreate,
    OkResponse,
)

router = APIRouter(prefix="/payables", tags=["payables"])


def _debt_to_out(d: StoreDebt, owner_db_id: int) -> StoreDebtOut:
    paid_centavos      = sum(p.amount_centavos for p in d.payments)
    remaining_centavos = max(0, d.original_amount_centavos - paid_centavos)
    return StoreDebtOut(
        id=d.id,
        ownerId=f"TH-MA-{owner_db_id:04d}",
        creditorId=d.creditor_id,
        name=d.name,
        originalAmountCentavos=d.original_amount_centavos,
        paidCentavos=paid_centavos,
        remainingCentavos=remaining_centavos,
        dueDate=d.due_date,
        details=d.details,
        occurredAt=d.occurred_at.isoformat(),
    )


# ── CREDITORS ────────────────────────────────────────────────────────────────

@router.get("/creditors", response_model=List[CreditorOut])
def list_creditors(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    creditors = (
        db.query(StoreCreditor)
        .filter(StoreCreditor.owner_id == owner_id)
        .order_by(StoreCreditor.name)
        .all()
    )
    return [
        CreditorOut(id=c.id, ownerId=f"TH-MA-{owner_id:04d}", name=c.name)
        for c in creditors
    ]


@router.post("/creditors", response_model=CreditorOut, status_code=201)
def create_creditor(
    body: CreditorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    creditor = StoreCreditor(
        id=f"creditor-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        name=body.name.strip(),
    )
    db.add(creditor)
    db.commit()
    db.refresh(creditor)
    return CreditorOut(id=creditor.id, ownerId=f"TH-MA-{owner_id:04d}", name=creditor.name)


# ── STORE DEBTS ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[StoreDebtOut])
def list_store_debts(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    debts = (
        db.query(StoreDebt)
        .filter(StoreDebt.owner_id == owner_id)
        .order_by(StoreDebt.occurred_at.desc())
        .all()
    )
    return [_debt_to_out(d, owner_id) for d in debts]


@router.post("", response_model=StoreDebtOut, status_code=201)
def create_store_debt(
    body: StoreDebtCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]

    # Resolve creditor: use creditorId if provided, otherwise find-or-create by creditorName
    creditor_name = (body.creditorName or "").strip() or (body.name or "").strip()
    if body.creditorId:
        creditor = db.query(StoreCreditor).filter(
            StoreCreditor.id == body.creditorId,
            StoreCreditor.owner_id == owner_id,
        ).first()
        if not creditor:
            raise HTTPException(404, "Creditor not found")
    elif creditor_name:
        creditor = db.query(StoreCreditor).filter(
            StoreCreditor.owner_id == owner_id,
            StoreCreditor.name == creditor_name,
        ).first()
        if not creditor:
            creditor = StoreCreditor(
                id=f"creditor-{uuid.uuid4().hex[:10]}",
                owner_id=owner_id,
                name=creditor_name,
            )
            db.add(creditor)
            db.flush()
    else:
        raise HTTPException(422, "creditorName or creditorId is required")

    # Accept either amountCentavos (frontend) or originalAmountCentavos (direct API)
    amount = body.originalAmountCentavos or body.amountCentavos or 0
    # Accept either occurredAt or default to now
    occurred_at_str = body.occurredAt or datetime.utcnow().isoformat()
    occurred_at = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00"))

    debt = StoreDebt(
        id=f"storedebt-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        creditor_id=creditor.id,
        name=creditor.name,
        original_amount_centavos=amount,
        due_date=body.dueDate,
        details=body.details,
        occurred_at=occurred_at,
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return _debt_to_out(debt, owner_id)


# ── PAYMENTS ─────────────────────────────────────────────────────────────────

@router.get("/payments", response_model=List[StoreDebtPaymentOut])
def list_payable_payments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    payments = (
        db.query(StoreDebtPayment)
        .filter(StoreDebtPayment.owner_id == owner_id)
        .order_by(StoreDebtPayment.occurred_at.desc())
        .all()
    )
    return [
        StoreDebtPaymentOut(
            id=p.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            debtId=p.debt_id,
            amountCentavos=p.amount_centavos,
            occurredAt=p.occurred_at.isoformat(),
        )
        for p in payments
    ]


@router.post("/payments", response_model=StoreDebtPaymentOut, status_code=201)
def pay_store_debt(
    body: StoreDebtPaymentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]

    debt = db.query(StoreDebt).filter(
        StoreDebt.id == body.debtId,
        StoreDebt.owner_id == owner_id,
    ).first()
    if not debt:
        raise HTTPException(404, "Store debt not found")

    paid_so_far = sum(p.amount_centavos for p in debt.payments)
    remaining   = debt.original_amount_centavos - paid_so_far
    if remaining <= 0:
        raise HTTPException(422, "Debt is already fully paid")
    if body.amountCentavos <= 0:
        raise HTTPException(422, "Payment amount must be positive")
    if body.amountCentavos > remaining:
        raise HTTPException(422, "Payment exceeds remaining balance")

    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))
    payment = StoreDebtPayment(
        id=f"sdpay-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        debt_id=body.debtId,
        amount_centavos=body.amountCentavos,
        occurred_at=occurred_at,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return StoreDebtPaymentOut(
        id=payment.id,
        ownerId=f"TH-MA-{owner_id:04d}",
        debtId=payment.debt_id,
        amountCentavos=payment.amount_centavos,
        occurredAt=payment.occurred_at.isoformat(),
    )
