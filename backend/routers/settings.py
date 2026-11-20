"""
Settings router — owner profile and cashier management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user, require_role, hash_pin, verify_pin, verify_password, hash_password
from models import MayAri, Kahera
from schemas import (
    ProfileUpdate, PinChangeRequest,
    CashierOut, CashierUpdate, OkResponse,
)

router = APIRouter(prefix="/settings", tags=["settings"])


# ── OWNER PROFILE ─────────────────────────────────────────────────────────────

@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    owner = db.query(MayAri).filter(MayAri.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Owner not found")
    return {
        "id": f"TH-MA-{owner.id:04d}",
        "name": owner.full_name,
        "email": owner.email,
        "storeName": owner.store_name,
        "avatarId": owner.avatar_id,
    }


@router.patch("/profile", response_model=OkResponse)
def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    owner = db.query(MayAri).filter(MayAri.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Owner not found")

    if body.full_name is not None:
        owner.full_name = body.full_name.strip()
    if body.store_name is not None:
        owner.store_name = body.store_name.strip()
    if body.avatar_id is not None:
        owner.avatar_id = body.avatar_id

    db.commit()
    return OkResponse(message="Profile updated")


@router.post("/change-pin", response_model=OkResponse)
def change_pin(
    body: PinChangeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    owner = db.query(MayAri).filter(MayAri.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Owner not found")

    if owner.pin_hash and not verify_pin(body.current_pin, owner.pin_hash):
        raise HTTPException(401, "Current PIN is incorrect")

    owner.pin_hash = hash_pin(body.new_pin)
    db.commit()
    return OkResponse(message="PIN updated")


# ── CASHIERS ─────────────────────────────────────────────────────────────────

@router.get("/cashiers", response_model=List[CashierOut])
def list_cashiers(
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    cashiers = (
        db.query(Kahera)
        .filter(Kahera.owner_id == owner_id)
        .order_by(Kahera.full_name)
        .all()
    )
    return [
        CashierOut(
            id=f"TH-KH-{c.id:04d}",
            ownerId=f"TH-MA-{owner_id:04d}",
            name=c.full_name,
            status="active" if c.is_active else "inactive",
            avatarId=c.avatar_id,
        )
        for c in cashiers
    ]


@router.patch("/cashiers/{cashier_id}", response_model=CashierOut)
def update_cashier(
    cashier_id: str,
    body: CashierUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]

    # cashier_id is TH-KH-XXXX
    try:
        db_cashier_id = int(cashier_id.replace("TH-KH-", ""))
    except ValueError:
        raise HTTPException(422, "Invalid cashier ID format")

    c = db.query(Kahera).filter(
        Kahera.id == db_cashier_id,
        Kahera.owner_id == owner_id,
    ).first()
    if not c:
        raise HTTPException(404, "Cashier not found")

    if body.full_name is not None:
        c.full_name = body.full_name.strip()
    if body.avatar_id is not None:
        c.avatar_id = body.avatar_id
    if body.is_active is not None:
        c.is_active = body.is_active
        if c.is_active:
            c.failed_attempts = 0
            c.locked_until = None

    db.commit()
    db.refresh(c)

    return CashierOut(
        id=f"TH-KH-{c.id:04d}",
        ownerId=f"TH-MA-{owner_id:04d}",
        name=c.full_name,
        status="active" if c.is_active else "inactive",
        avatarId=c.avatar_id,
    )
