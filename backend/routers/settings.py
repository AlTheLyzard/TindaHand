"""
Settings router — owner profile and cashier management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user, require_role, hash_pin, verify_pin, verify_password, hash_password
from models import MayAri, Kahera
import json

from schemas import (
    ProfileUpdate, PinChangeRequest,
    CashierOut, CashierUpdate, OkResponse,
    CashierPermissionsOut, CashierPermissionsUpdate,
)
from pydantic import BaseModel

class SetTempPinRequest(BaseModel):
    owner_pin: str   # May-Ari verifies identity
    temp_pin: str    # the 4-digit temp PIN to assign

class KaheraChangePinRequest(BaseModel):
    new_pin: str     # Kahera's chosen permanent PIN

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

    # Verify identity via current PIN before allowing profile changes.
    if not body.current_pin:
        raise HTTPException(401, "Current PIN is required to save profile changes.")
    if not owner.pin_hash or not verify_pin(body.current_pin, owner.pin_hash):
        raise HTTPException(401, "Incorrect PIN. Please try again.")

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


def _resolve_cashier(db, cashier_id: str, owner_id: int):
    """Parse TH-KH-XXXX and return the Kahera row, or raise 422/404."""
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
    return c


@router.get("/cashiers/{cashier_id}/permissions", response_model=CashierPermissionsOut)
def get_cashier_permissions(
    cashier_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    c = _resolve_cashier(db, cashier_id, owner_id)
    permissions: list[str] = json.loads(c.permissions_json) if c.permissions_json else []
    return CashierPermissionsOut(cashier_id=cashier_id, permissions=permissions)


@router.post("/cashiers/{cashier_id}/set-temp-pin", response_model=OkResponse)
def set_temp_pin(
    cashier_id: str,
    body: SetTempPinRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    """
    May-Ari sets a temporary PIN for a Kahera.
    - Verifies the May-Ari's own PIN first.
    - Sets the Kahera's pin_hash to the temp PIN and marks pin_is_temporary=True.
    - The next time Kahera logs in, the backend returns pin_is_temporary=True,
      and the app forces her to choose a new permanent PIN before accessing the POS.
    """
    owner_id = current_user["db_id"]
    owner = db.query(MayAri).filter(MayAri.id == owner_id).first()
    if not owner:
        raise HTTPException(404, "Owner not found")
    if not owner.pin_hash or not verify_pin(body.owner_pin, owner.pin_hash):
        raise HTTPException(401, "Incorrect May-Ari PIN. Please try again.")
    if not body.temp_pin or not body.temp_pin.isdigit() or len(body.temp_pin) != 4:
        raise HTTPException(422, "Temporary PIN must be exactly 4 numeric digits.")

    c = _resolve_cashier(db, cashier_id, owner_id)
    c.pin_hash = hash_pin(body.temp_pin)
    c.pin_hash_cache = c.pin_hash   # keep offline cache fresh
    c.pin_is_temporary = True
    db.commit()
    return OkResponse(message="Temporary PIN set. Kahera will be prompted to change it on next login.")


@router.post("/cashiers/change-pin", response_model=OkResponse)
def kahera_change_own_pin(
    body: KaheraChangePinRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("cashier")),
):
    """
    Kahera sets her own permanent PIN after logging in with a temporary one.
    Requires a valid Kahera JWT (issued at login).
    Clears pin_is_temporary so the forced-change screen is not shown again.
    """
    if not body.new_pin or not body.new_pin.isdigit() or len(body.new_pin) != 4:
        raise HTTPException(422, "PIN must be exactly 4 numeric digits.")

    kahera_id = current_user["db_id"]
    kahera = db.query(Kahera).filter(Kahera.id == kahera_id).first()
    if not kahera or not kahera.is_active:
        raise HTTPException(404, "Kahera not found or deactivated.")

    kahera.pin_hash = hash_pin(body.new_pin)
    kahera.pin_hash_cache = kahera.pin_hash
    kahera.pin_is_temporary = False
    db.commit()
    return OkResponse(message="PIN updated successfully.")


@router.patch("/cashiers/{cashier_id}/permissions", response_model=CashierPermissionsOut)
def update_cashier_permissions(
    cashier_id: str,
    body: CashierPermissionsUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    c = _resolve_cashier(db, cashier_id, owner_id)
    # Deduplicate and store as JSON array.
    unique_perms = list(dict.fromkeys(body.permissions))
    c.permissions_json = json.dumps(unique_perms)
    db.commit()
    return CashierPermissionsOut(cashier_id=cashier_id, permissions=unique_perms)
