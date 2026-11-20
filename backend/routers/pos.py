"""
POS (Point of Sale) router — checkout, sales history, customers.

Greedy Coin Change lives here:
  When a customer pays with cash, the checkout endpoint runs greedy coin change
  to figure out the exact breakdown of bills and coins to give as change.
  Philippine denominations (centavos): 100000, 50000, 20000, 10000, 5000,
  2000, 1000, 500, 100, 25, 10, 5, 1.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import Product, StockBatch, Sale, SaleLine, SaleTender, Customer, CustomerDebt, DebtPayment
from schemas import (
    CheckoutCommand, CheckoutResult, SaleOut, SalePaymentOut,
    SaleTenderOut, ProductSelection, ProductSelectionLine,
    ChangeBreakdown, CustomerOut, CustomerCreate, OkResponse,
)

router = APIRouter(prefix="/pos", tags=["pos"])


# ── Greedy Coin Change ────────────────────────────────────────────────────────

# Philippine banknotes and coins in centavos, largest first
PH_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 100, 25, 10, 5, 1]

def greedy_coin_change(change_centavos: int) -> ChangeBreakdown:
    """
    Greedy algorithm: always pick the largest denomination that fits.

    Why greedy works for Philippine money:
    Philippine denominations form a 'canonical' coin system — picking the
    biggest coin/bill that fits always gives the fewest pieces overall.
    (This is NOT guaranteed for arbitrary coin sets, but it holds for most
    real-world currency systems.)

    Example: ₱135 change = ₱100 + ₱20 + ₱10 + ₱5
    """
    remaining = change_centavos
    breakdown: Dict[int, int] = {}

    for denom in PH_DENOMINATIONS:
        if remaining <= 0:
            break
        count = remaining // denom
        if count > 0:
            breakdown[denom] = count
            remaining -= denom * count

    return ChangeBreakdown(
        totalChangeCentavos=change_centavos,
        breakdown=breakdown,
    )


# ── helpers ──────────────────────────────────────────────────────────────────

def _parse_centavos(raw: Optional[str]) -> Optional[int]:
    """Parse '120.50' → 12050, '120' → 12000. Returns None if blank/invalid."""
    if not raw or not raw.strip():
        return None
    try:
        pesos = float(raw.strip())
        return round(pesos * 100)
    except ValueError:
        return None


def _build_sale_out(sale: Sale) -> SaleOut:
    items: ProductSelection = {}
    for line in sale.lines:
        items[line.product_id or line.item_name] = ProductSelectionLine(
            productId=line.product_id or line.item_name,
            itemName=line.item_name,
            unitPriceCentavos=line.unit_price_centavos,
            quantity=line.quantity,
        )

    tenders = [
        SaleTenderOut(
            method=t.method,
            receivedCentavos=t.received_centavos,
            reference=t.reference,
        )
        for t in sale.tenders
    ]

    total_received = sum(t.received_centavos for t in sale.tenders)
    applied        = min(sale.total_centavos, total_received)
    cash_tenders   = [t for t in sale.tenders if t.method == "cash"]
    cash_received  = sum(t.received_centavos for t in cash_tenders)
    cash_change    = max(0, cash_received - (sale.total_centavos - sum(
        t.received_centavos for t in sale.tenders if t.method == "gcash"
    )))

    payment = SalePaymentOut(
        id=f"payment-{sale.id}",
        saleId=sale.id,
        method=sale.payment_method.value if sale.payment_method else "cash",
        tenders=tenders,
        receivedCentavos=total_received,
        appliedCentavos=applied,
        cashChangeCentavos=cash_change,
    )

    return SaleOut(
        id=sale.id,
        ownerId=f"TH-MA-{sale.owner_id:04d}",
        occurredAt=sale.occurred_at.isoformat(),
        customerId=sale.customer_id,
        items=items,
        totalCentavos=sale.total_centavos,
        remainingCentavos=sale.remaining_centavos,
        paymentStatus=sale.payment_status.value,
        payment=payment,
    )


def _deduct_stock(product: Product, quantity: int, db: Session) -> None:
    """
    Deduct stock using FEFO (First Expiry, First Out):
    consume from the batch with the earliest expiry date first.
    """
    # Separate batches: expiring first, then no-expiry
    expiring = sorted(
        [b for b in product.batches if not b.no_expiry and b.expiration_date and b.quantity > 0],
        key=lambda b: b.expiration_date,
    )
    no_exp = [b for b in product.batches if b.no_expiry and b.quantity > 0]
    ordered = expiring + no_exp

    remaining = quantity
    for batch in ordered:
        if remaining <= 0:
            break
        take = min(batch.quantity, remaining)
        batch.quantity -= take
        remaining -= take

    product.stock = sum(b.quantity for b in product.batches)


# ── CUSTOMERS ────────────────────────────────────────────────────────────────

@router.get("/customers", response_model=List[CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    customers = db.query(Customer).filter(Customer.owner_id == owner_id).order_by(Customer.name).all()
    return [
        CustomerOut(id=c.id, ownerId=f"TH-MA-{c.owner_id:04d}", name=c.name)
        for c in customers
    ]


@router.post("/customers", response_model=CustomerOut, status_code=201)
def create_customer(
    body: CustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    customer = Customer(
        id=f"customer-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        name=body.name.strip(),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerOut(id=customer.id, ownerId=f"TH-MA-{owner_id:04d}", name=customer.name)


# ── CHECKOUT ─────────────────────────────────────────────────────────────────

@router.post("/checkout", response_model=CheckoutResult, status_code=201)
def checkout(
    body: CheckoutCommand,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Commit a POS sale.  Steps:
    1. Validate every product exists and has enough stock.
    2. Parse payment amounts and validate them.
    3. Deduct stock (FEFO order).
    4. Persist sale, sale lines, and tenders.
    5. If partial payment, create a CustomerDebt + initial DebtPayment.
    6. Run Greedy Coin Change on cash change (returned to frontend).
    """
    owner_id = current_user["db_id"]

    if not body.selection:
        raise HTTPException(422, "Cart is empty")

    # 1. Validate stock
    total_centavos = 0
    product_rows: Dict[str, Product] = {}

    for product_id, line in body.selection.items():
        p = db.query(Product).filter(
            Product.id == product_id,
            Product.owner_id == owner_id,
            Product.is_deleted == False,
        ).first()
        if not p:
            raise HTTPException(422, f"Product {product_id} not found")
        if p.stock < line.quantity:
            raise HTTPException(422, f"Not enough stock for {p.name} (have {p.stock}, need {line.quantity})")
        product_rows[product_id] = p
        total_centavos += line.unitPriceCentavos * line.quantity

    # 2. Parse payments
    draft = body.draft
    cash_raw   = _parse_centavos(draft.cashRaw)
    gcash_raw  = _parse_centavos(draft.gcashRaw)

    if draft.method == "cash":
        if cash_raw is None or cash_raw <= 0:
            raise HTTPException(422, "Enter a cash amount")
        if cash_raw < total_centavos:
            raise HTTPException(422, "Cash amount is less than total")
        paid_centavos   = total_centavos
        change_centavos = cash_raw - total_centavos

    elif draft.method == "gcash":
        gcash_raw = gcash_raw or total_centavos   # GCash exact amount default
        paid_centavos   = total_centavos
        change_centavos = 0

    elif draft.method == "split":
        if cash_raw is None or gcash_raw is None:
            raise HTTPException(422, "Split payment requires both cash and GCash amounts")
        total_tendered = cash_raw + gcash_raw
        if total_tendered < total_centavos:
            raise HTTPException(422, "Total tendered is less than sale total")
        paid_centavos   = total_centavos
        change_centavos = max(0, cash_raw - (total_centavos - gcash_raw))

    elif draft.method == "partial":
        partial_method = draft.partialMethod or "cash"
        tendered_raw = cash_raw if partial_method == "cash" else gcash_raw
        if tendered_raw is None or tendered_raw < 0:
            raise HTTPException(422, "Enter a payment amount for partial sale")
        paid_centavos   = min(tendered_raw, total_centavos)
        change_centavos = max(0, tendered_raw - total_centavos)
        if partial_method == "cash":
            cash_raw  = tendered_raw
            gcash_raw = None
        else:
            gcash_raw = tendered_raw
            cash_raw  = None

    else:
        raise HTTPException(422, f"Unknown payment method: {draft.method}")

    remaining_centavos = total_centavos - paid_centavos

    # 3. Customer lookup / creation (for partial sales)
    customer: Optional[Customer] = None
    if draft.method == "partial" and remaining_centavos > 0:
        if draft.customerId:
            customer = db.query(Customer).filter(
                Customer.id == draft.customerId,
                Customer.owner_id == owner_id,
            ).first()
            if not customer:
                raise HTTPException(422, "Customer not found")
        else:
            name = (draft.customerName or "").strip()
            if not name:
                raise HTTPException(422, "Customer name is required for partial payment")
            # Reuse if name matches (case-insensitive)
            norm = name.lower().replace("  ", " ")
            customer = next(
                (c for c in db.query(Customer).filter(Customer.owner_id == owner_id).all()
                 if c.name.lower().replace("  ", " ") == norm),
                None,
            )
            if not customer:
                customer = Customer(
                    id=f"customer-{body.id}",
                    owner_id=owner_id,
                    name=name,
                )
                db.add(customer)
                db.flush()

    # 4. Deduct stock
    for product_id, line in body.selection.items():
        _deduct_stock(product_rows[product_id], line.quantity, db)

    # 5. Persist sale
    occurred_at = datetime.fromisoformat(body.occurredAt.replace("Z", "+00:00"))

    if draft.method == "partial":
        pm = draft.partialMethod or "cash"
    else:
        pm = draft.method

    sale = Sale(
        id=body.id,
        owner_id=owner_id,
        kahera_id=body.kahera_id,
        customer_id=customer.id if customer else None,
        total_centavos=total_centavos,
        remaining_centavos=remaining_centavos,
        payment_status="paid" if remaining_centavos == 0 else ("partial" if paid_centavos > 0 else "unpaid"),
        payment_method=draft.method,
        occurred_at=occurred_at,
    )
    db.add(sale)
    db.flush()

    for product_id, line in body.selection.items():
        db.add(SaleLine(
            sale_id=body.id,
            product_id=product_id,
            item_name=line.itemName,
            unit_price_centavos=line.unitPriceCentavos,
            quantity=line.quantity,
        ))

    # Tenders
    if cash_raw is not None:
        db.add(SaleTender(
            sale_id=body.id,
            method="cash",
            received_centavos=cash_raw,
            reference=None,
        ))
    if gcash_raw is not None:
        db.add(SaleTender(
            sale_id=body.id,
            method="gcash",
            received_centavos=gcash_raw,
            reference=draft.reference.strip() or None,
        ))

    db.flush()

    # 6. Customer debt + initial payment mirror (for partial sales)
    if customer and remaining_centavos > 0:
        debt_id = f"debt-{body.id}"
        debt = CustomerDebt(
            id=debt_id,
            owner_id=owner_id,
            customer_id=customer.id,
            sale_id=body.id,
            name=customer.name,
            original_amount_centavos=total_centavos,
            amount_centavos=remaining_centavos,
            borrowing="product",
            due_date=None,
            details=f"POS sale {body.id}",
            payment_status="partial" if paid_centavos > 0 else "unpaid",
            occurred_at=occurred_at,
        )
        db.add(debt)
        db.flush()

        # Mirror the initial partial payment into AR so balance is correct
        if paid_centavos > 0:
            initial_payment = DebtPayment(
                id=f"initial-payment-{body.id}",
                owner_id=owner_id,
                debt_id=debt_id,
                amount_centavos=paid_centavos,
                reference=draft.reference.strip() or None,
                occurred_at=occurred_at,
            )
            db.add(initial_payment)

    db.commit()
    db.refresh(sale)

    # 7. Greedy Coin Change
    change_breakdown: Optional[ChangeBreakdown] = None
    if change_centavos > 0 and cash_raw is not None:
        change_breakdown = greedy_coin_change(change_centavos)

    return CheckoutResult(
        sale=_build_sale_out(sale),
        change=change_breakdown,
    )


# ── SALES HISTORY ────────────────────────────────────────────────────────────

@router.get("/sales", response_model=List[SaleOut])
def list_sales(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    sales = (
        db.query(Sale)
        .filter(Sale.owner_id == owner_id)
        .order_by(Sale.occurred_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_build_sale_out(s) for s in sales]


@router.get("/sales/{sale_id}", response_model=SaleOut)
def get_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.owner_id == owner_id,
    ).first()
    if not sale:
        raise HTTPException(404, "Sale not found")
    return _build_sale_out(sale)
