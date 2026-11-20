"""
Inventory router — products, stock batches, assets, restocks.

Min-Heap EEF (Earliest Expiry First) lives here:
  GET /inventory/expiry-alerts returns products sorted by soonest expiry date,
  computed with a min-heap so the front end always gets them in FEFO order.
"""

import uuid
import heapq
from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, require_role
from models import Product, StockBatch, Asset, Restock
from schemas import (
    ProductOut, ProductCreate, ProductUpdate,
    StockBatchOut, RestockIn, RestockOut,
    AssetOut, AssetCreate, AssetUpdate,
    ExpiryAlert, OkResponse,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _product_to_out(p: Product) -> ProductOut:
    batches = [
        StockBatchOut(
            id=b.id,
            quantity=b.quantity,
            noExpiry=b.no_expiry,
            expirationDate=b.expiration_date,
        )
        for b in (p.batches or [])
        if b.quantity > 0
    ]
    return ProductOut(
        id=p.id,
        name=p.name,
        category=p.category.value,
        unitPriceCentavos=p.unit_price_centavos,
        costCentavos=p.cost_centavos,
        stock=p.stock,
        expirationDate=p.expiration_date,
        photoUri=p.photo_uri,
        batches=batches or None,
    )


def _recalc_stock(product: Product) -> None:
    """Keep product.stock in sync with sum of batch quantities."""
    product.stock = sum(b.quantity for b in product.batches if b.quantity > 0)


def _owner_id_str(owner_id: int) -> str:
    return f"TH-MA-{owner_id:04d}"


# ── PRODUCTS ─────────────────────────────────────────────────────────────────

@router.get("/products", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    products = (
        db.query(Product)
        .filter(Product.owner_id == owner_id, Product.is_deleted == False)
        .order_by(Product.name)
        .all()
    )
    return [_product_to_out(p) for p in products]


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    product_id = f"prod-{uuid.uuid4().hex[:12]}"

    product = Product(
        id=product_id,
        owner_id=owner_id,
        name=body.name,
        category=body.category,
        unit_price_centavos=body.unitPriceCentavos,
        cost_centavos=body.costCentavos,
        stock=0,
        expiration_date=body.expirationDate,
        photo_uri=body.photoUri,
    )
    db.add(product)
    db.flush()

    # Create batches if supplied; otherwise create a single no-expiry batch
    if body.batches:
        for b in body.batches:
            batch = StockBatch(
                id=b.id or f"batch-{uuid.uuid4().hex[:10]}",
                product_id=product_id,
                quantity=b.quantity,
                no_expiry=b.noExpiry,
                expiration_date=b.expirationDate if not b.noExpiry else None,
            )
            db.add(batch)
    elif body.stock > 0:
        batch = StockBatch(
            id=f"batch-{uuid.uuid4().hex[:10]}",
            product_id=product_id,
            quantity=body.stock,
            no_expiry=(body.expirationDate is None),
            expiration_date=body.expirationDate,
        )
        db.add(batch)

    db.flush()
    _recalc_stock(product)
    db.commit()
    db.refresh(product)
    return _product_to_out(product)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    p = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == owner_id,
        Product.is_deleted == False,
    ).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return _product_to_out(p)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    p = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == owner_id,
        Product.is_deleted == False,
    ).first()
    if not p:
        raise HTTPException(404, "Product not found")

    if body.name is not None:
        p.name = body.name
    if body.category is not None:
        p.category = body.category
    if body.unitPriceCentavos is not None:
        p.unit_price_centavos = body.unitPriceCentavos
    if body.costCentavos is not None:
        p.cost_centavos = body.costCentavos
    if body.expirationDate is not None:
        p.expiration_date = body.expirationDate
    if body.photoUri is not None:
        p.photo_uri = body.photoUri

    db.commit()
    db.refresh(p)
    return _product_to_out(p)


@router.delete("/products/{product_id}", response_model=OkResponse)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    p = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == owner_id,
    ).first()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_deleted = True
    db.commit()
    return OkResponse(message="Product deleted")


# ── RESTOCK ──────────────────────────────────────────────────────────────────

@router.post("/products/{product_id}/restock", response_model=RestockOut, status_code=201)
def restock_product(
    product_id: str,
    body: RestockIn,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    p = db.query(Product).filter(
        Product.id == product_id,
        Product.owner_id == owner_id,
        Product.is_deleted == False,
    ).first()
    if not p:
        raise HTTPException(404, "Product not found")
    if body.quantity < 1:
        raise HTTPException(422, "Quantity must be at least 1")

    no_expiry = (body.expirationDate == "noExpiry")
    exp_date  = None if no_expiry else body.expirationDate

    # Find or create a matching batch
    batch_id = body.batchId or f"batch-{uuid.uuid4().hex[:10]}"
    existing = db.query(StockBatch).filter(StockBatch.id == batch_id).first()
    if existing:
        existing.quantity += body.quantity
    else:
        new_batch = StockBatch(
            id=batch_id,
            product_id=product_id,
            quantity=body.quantity,
            no_expiry=no_expiry,
            expiration_date=exp_date,
        )
        db.add(new_batch)

    _recalc_stock(p)
    # Also update product-level expiration to the earliest batch expiry
    dated_batches = [b for b in p.batches if not b.no_expiry and b.expiration_date and b.quantity > 0]
    if dated_batches:
        p.expiration_date = min(b.expiration_date for b in dated_batches)

    # Write restock log
    restock_id = f"restock-{uuid.uuid4().hex[:10]}"
    record = Restock(
        id=restock_id,
        owner_id=owner_id,
        product_id=product_id,
        item_name=p.name,
        quantity=body.quantity,
        stock_date=body.stockDate,
        expiration_date=body.expirationDate,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return RestockOut(
        id=record.id,
        productId=record.product_id,
        itemName=record.item_name,
        quantity=record.quantity,
        stockDate=record.stock_date,
        expirationDate=record.expiration_date,
        recordedAt=record.recorded_at.isoformat(),
    )


@router.get("/restocks", response_model=List[RestockOut])
def list_restocks(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    records = (
        db.query(Restock)
        .filter(Restock.owner_id == owner_id)
        .order_by(Restock.recorded_at.desc())
        .all()
    )
    return [
        RestockOut(
            id=r.id,
            productId=r.product_id,
            itemName=r.item_name,
            quantity=r.quantity,
            stockDate=r.stock_date,
            expirationDate=r.expiration_date,
            recordedAt=r.recorded_at.isoformat(),
        )
        for r in records
    ]


# ── EXPIRY ALERTS — Min-Heap EEF ─────────────────────────────────────────────

@router.get("/expiry-alerts", response_model=List[ExpiryAlert])
def expiry_alerts(
    days_ahead: int = Query(30, ge=0, le=365, description="Warn about products expiring within this many days"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Returns products sorted by earliest expiry date using a Min-Heap (heapq).

    Why a min-heap?
    We want the soonest-expiring product at the top.  With a heap we can push
    every product in O(n log n) and pop them out already sorted — this is
    'Earliest Expiry First' (EEF), the same scheduling algorithm used in
    inventory management and operating systems to prevent waste.
    """
    owner_id = current_user["db_id"]
    today    = date.today()

    products = (
        db.query(Product)
        .filter(
            Product.owner_id == owner_id,
            Product.is_deleted == False,
            Product.expiration_date.isnot(None),
            Product.stock > 0,
        )
        .all()
    )

    heap: list = []  # min-heap entries: (days_until_expiry, product)

    for p in products:
        try:
            exp = date.fromisoformat(p.expiration_date[:10])
        except (ValueError, TypeError):
            continue
        days = (exp - today).days
        if days <= days_ahead:
            # Python's heapq is a min-heap by first element
            heapq.heappush(heap, (days, p.id, p))

    results: List[ExpiryAlert] = []
    while heap:
        days, _, p = heapq.heappop(heap)
        results.append(ExpiryAlert(
            productId=p.id,
            name=p.name,
            stock=p.stock,
            expirationDate=p.expiration_date,
            daysUntilExpiry=days,
        ))

    return results


# ── ASSETS ───────────────────────────────────────────────────────────────────

@router.get("/assets", response_model=List[AssetOut])
def list_assets(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    owner_id = current_user["db_id"]
    assets = (
        db.query(Asset)
        .filter(Asset.owner_id == owner_id, Asset.is_deleted == False)
        .order_by(Asset.name)
        .all()
    )
    return [
        AssetOut(
            id=a.id,
            name=a.name,
            valueCentavos=a.value_centavos,
            usefulLifeYears=a.useful_life_years,
            classification=a.classification.value,
            recordedDate=a.recorded_date,
        )
        for a in assets
    ]


@router.post("/assets", response_model=AssetOut, status_code=201)
def create_asset(
    body: AssetCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    asset = Asset(
        id=f"asset-{uuid.uuid4().hex[:10]}",
        owner_id=owner_id,
        name=body.name,
        value_centavos=body.valueCentavos,
        useful_life_years=body.usefulLifeYears,
        classification=body.classification,
        recorded_date=body.recordedDate,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return AssetOut(
        id=asset.id,
        name=asset.name,
        valueCentavos=asset.value_centavos,
        usefulLifeYears=asset.useful_life_years,
        classification=asset.classification.value,
        recordedDate=asset.recorded_date,
    )


@router.patch("/assets/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    a = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.owner_id == owner_id,
        Asset.is_deleted == False,
    ).first()
    if not a:
        raise HTTPException(404, "Asset not found")

    if body.name is not None:
        a.name = body.name
    if body.valueCentavos is not None:
        a.value_centavos = body.valueCentavos
    if body.usefulLifeYears is not None:
        a.useful_life_years = body.usefulLifeYears
    if body.classification is not None:
        a.classification = body.classification
    if body.recordedDate is not None:
        a.recorded_date = body.recordedDate

    db.commit()
    db.refresh(a)
    return AssetOut(
        id=a.id,
        name=a.name,
        valueCentavos=a.value_centavos,
        usefulLifeYears=a.useful_life_years,
        classification=a.classification.value,
        recordedDate=a.recorded_date,
    )


@router.delete("/assets/{asset_id}", response_model=OkResponse)
def delete_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    a = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.owner_id == owner_id,
    ).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    a.is_deleted = True
    db.commit()
    return OkResponse(message="Asset deleted")
