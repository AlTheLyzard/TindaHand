"""
Quick Add router — single endpoint that creates either an expense,
a customer debt, or a store debt depending on the 'kind' field.
Mirrors the QuickAdd screen in the app which uses one form for all three.
"""

import uuid
from datetime import datetime
from typing import Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import Expense, CustomerDebt, StoreDebt, StoreCreditor, Customer
from schemas import QuickAddCreate, ExpenseOut, CustomerDebtOut, StoreDebtOut

router = APIRouter(prefix="/quick-add", tags=["quick-add"])

EXPENSE_CATEGORIES = ["Electricity Expense", "Water Expense", "Others Expense"]


@router.post("", status_code=201)
def quick_add(
    body: QuickAddCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    """
    Dispatches to the right sub-resource based on body.kind:
      'expense'      → creates Expense
      'customerDebt' → creates CustomerDebt (and Customer if new)
      'storeDebt'    → creates StoreDebt (creditor must already exist)
    """
    owner_id    = current_user["db_id"]
    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))

    if body.kind == "expense":
        if body.category not in EXPENSE_CATEGORIES:
            raise HTTPException(422, f"Category must be one of: {EXPENSE_CATEGORIES}")
        if not body.expenseDate:
            raise HTTPException(422, "expenseDate is required for expenses")
        if body.amountCentavos <= 0:
            raise HTTPException(422, "amountCentavos must be positive")

        expense = Expense(
            id=f"expense-{uuid.uuid4().hex[:10]}",
            owner_id=owner_id,
            name=(body.name or body.category).strip(),
            category=body.category,
            amount_centavos=body.amountCentavos,
            details=body.details,
            expense_date=body.expenseDate,
            occurred_at=occurred_at,
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)

        return ExpenseOut(
            id=expense.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            name=expense.name,
            category=expense.category,
            amountCentavos=expense.amount_centavos,
            details=expense.details,
            expenseDate=expense.expense_date,
            occurredAt=expense.occurred_at.isoformat(),
        )

    elif body.kind == "customerDebt":
        if not body.name and not body.customerId:
            raise HTTPException(422, "name or customerId is required for customer debt")
        if body.amountCentavos <= 0:
            raise HTTPException(422, "amountCentavos must be positive")

        # Find or create customer
        customer = None
        if body.customerId:
            customer = db.query(Customer).filter(
                Customer.id == body.customerId,
                Customer.owner_id == owner_id,
            ).first()
            if not customer:
                raise HTTPException(404, "Customer not found")
        else:
            name = body.name.strip()
            norm = name.lower().replace("  ", " ")
            customer = next(
                (c for c in db.query(Customer).filter(Customer.owner_id == owner_id).all()
                 if c.name.lower().replace("  ", " ") == norm),
                None,
            )
            if not customer:
                customer = Customer(
                    id=f"customer-{uuid.uuid4().hex[:10]}",
                    owner_id=owner_id,
                    name=name,
                )
                db.add(customer)
                db.flush()

        debt = CustomerDebt(
            id=f"debt-{uuid.uuid4().hex[:10]}",
            owner_id=owner_id,
            customer_id=customer.id,
            sale_id=None,
            name=customer.name,
            original_amount_centavos=body.amountCentavos,
            amount_centavos=body.amountCentavos,
            borrowing=body.borrowing or "cash",
            due_date=body.dueDate,
            details=body.details,
            payment_status="unpaid",
            occurred_at=occurred_at,
        )
        db.add(debt)
        db.commit()
        db.refresh(debt)

        return CustomerDebtOut(
            id=debt.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            customerId=debt.customer_id,
            saleId=None,
            name=debt.name,
            originalAmountCentavos=debt.original_amount_centavos,
            amountCentavos=debt.amount_centavos,
            paidCentavos=0,
            borrowing=debt.borrowing.value if debt.borrowing else None,
            items=None,
            dueDate=debt.due_date,
            details=debt.details,
            paymentStatus=debt.payment_status.value,
            occurredAt=debt.occurred_at.isoformat(),
        )

    elif body.kind == "storeDebt":
        if not body.name:
            raise HTTPException(422, "name is required for store debt")
        if body.amountCentavos <= 0:
            raise HTTPException(422, "amountCentavos must be positive")

        # Find or create creditor
        creditor = None
        if body.creditorId:
            creditor = db.query(StoreCreditor).filter(
                StoreCreditor.id == body.creditorId,
                StoreCreditor.owner_id == owner_id,
            ).first()
            if not creditor:
                raise HTTPException(404, "Creditor not found")
        else:
            name = body.name.strip()
            norm = name.lower()
            creditor = next(
                (c for c in db.query(StoreCreditor).filter(StoreCreditor.owner_id == owner_id).all()
                 if c.name.lower() == norm),
                None,
            )
            if not creditor:
                creditor = StoreCreditor(
                    id=f"creditor-{uuid.uuid4().hex[:10]}",
                    owner_id=owner_id,
                    name=name,
                )
                db.add(creditor)
                db.flush()

        store_debt = StoreDebt(
            id=f"storedebt-{uuid.uuid4().hex[:10]}",
            owner_id=owner_id,
            creditor_id=creditor.id,
            name=creditor.name,
            original_amount_centavos=body.amountCentavos,
            due_date=body.dueDate,
            details=body.details,
            occurred_at=occurred_at,
        )
        db.add(store_debt)
        db.commit()
        db.refresh(store_debt)

        return StoreDebtOut(
            id=store_debt.id,
            ownerId=f"TH-MA-{owner_id:04d}",
            creditorId=store_debt.creditor_id,
            name=store_debt.name,
            originalAmountCentavos=store_debt.original_amount_centavos,
            paidCentavos=0,
            remainingCentavos=store_debt.original_amount_centavos,
            dueDate=store_debt.due_date,
            details=store_debt.details,
            occurredAt=store_debt.occurred_at.isoformat(),
        )

    else:
        raise HTTPException(422, f"Unknown kind: {body.kind}")
