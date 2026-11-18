from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Optional

from database import get_db
from models import MayAri, Kahera
from auth import (
    hash_password, verify_password,
    hash_pin, verify_pin,
    create_access_token, require_role, get_current_user,
    build_offline_cache_payload,
)
from schemas import (
    RegisterRequest, LoginRequest,
    KaheraLoginRequest, KaheraLoginByPinRequest, KaheraCreateRequest, KaheraStatusRequest,
    TokenResponse, MeResponse, OkResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES     = 15


# ── 1. REGISTER (May-Ari) ────────────────────────────────────────────────────

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new store owner account. Password is bcrypt-hashed; PIN is Argon2id."""
    if db.query(MayAri).filter(MayAri.email == body.email).first():
        raise HTTPException(400, "Email already registered")

    owner = MayAri(
        full_name     = body.full_name.strip(),
        email         = body.email,
        password_hash = hash_password(body.password),
        pin_hash      = hash_pin(body.pin) if body.pin else None,
        store_name    = body.store_name,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)

    token = create_access_token({"sub": str(owner.id), "role": "owner"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "full_name": owner.full_name,
        "id": f"TH-MA-{owner.id:04d}",
    }


# ── 2. MAY-ARI LOGIN ─────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    May-Ari logs in with their display ID (TH-MA-XXXX) + 4-digit PIN.
    Returns a JWT valid for 8 hours.
    """
    try:
        numeric_id = int(body.owner_id.strip().upper().split("-")[-1])
    except (ValueError, IndexError):
        raise HTTPException(400, "Invalid owner ID format. Expected TH-MA-XXXX.")

    owner = db.query(MayAri).filter(MayAri.id == numeric_id).first()

    if not owner or not owner.pin_hash:
        raise HTTPException(401, "Invalid ID or PIN")

    if not verify_pin(body.pin, owner.pin_hash):
        raise HTTPException(401, "Invalid ID or PIN")

    if not owner.is_active:
        raise HTTPException(403, "Account is deactivated")

    # ← Token creation is at this indentation level, NOT inside the is_active check above
    token = create_access_token({"sub": str(owner.id), "role": "owner"})
    return TokenResponse(access_token=token, full_name=owner.full_name)


# ── 3. KAHERA LOGIN ──────────────────────────────────────────────────────────

@router.post("/kahera/login")
def kahera_login(body: KaheraLoginRequest, db: Session = Depends(get_db)):
    """
    Cashier logs in with owner ID + cashier ID + PIN.
    Checks lockout, verifies Argon2id PIN, returns JWT + offline cache payload.
    """
    try:
        owner_numeric   = int(body.owner_id.strip().upper().split("-")[-1])
        kahera_numeric  = int(body.kahera_id.strip().upper().split("-")[-1])
    except (ValueError, IndexError):
        raise HTTPException(400, "Invalid ID format. Expected TH-MA-XXXX and TH-KH-XXXX.")

    kahera = db.query(Kahera).filter(
        Kahera.id == kahera_numeric,
        Kahera.owner_id == owner_numeric,
    ).first()

    if not kahera:
        raise HTTPException(404, "Cashier not found for this store")

    if not kahera.is_active:
        raise HTTPException(403, "This cashier account has been deactivated")

    if kahera.locked_until and kahera.locked_until > datetime.now(timezone.utc):
        raise HTTPException(429, f"Account locked. Try again after {kahera.locked_until.strftime('%H:%M')} UTC")

    if not verify_pin(body.pin, kahera.pin_hash):
        kahera.failed_attempts += 1
        if kahera.failed_attempts >= MAX_FAILED_ATTEMPTS:
            kahera.locked_until    = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            kahera.failed_attempts = 0
            db.commit()
            raise HTTPException(429, f"Too many failed attempts. Locked for {LOCKOUT_MINUTES} minutes.")
        db.commit()
        raise HTTPException(401, f"Invalid PIN. {MAX_FAILED_ATTEMPTS - kahera.failed_attempts} attempts remaining.")

    kahera.failed_attempts = 0
    kahera.locked_until    = None
    db.commit()

    token = create_access_token({
        "sub":      str(kahera.id),
        "role":     "cashier",
        "owner_id": kahera.owner_id,
    })
    offline_cache = build_offline_cache_payload(kahera.id, kahera.pin_hash)

    return {
        "access_token":  token,
        "token_type":    "bearer",
        "full_name":     kahera.full_name,
        "role":          "cashier",
        "expires_in":    8 * 3600,
        "offline_cache": offline_cache,
    }


# ── 3b. KAHERA LOGIN BY PIN (app login screen: owner_id + pin only) ──────────

@router.post("/kahera/login-by-pin")
def kahera_login_by_pin(body: KaheraLoginByPinRequest, db: Session = Depends(get_db)):
    """
    App login screen collects owner_id + PIN only (no kahera_id field).
    Tries every active cashier for that owner until one matches the PIN.
    Returns the same shape as /kahera/login.
    """
    try:
        owner_numeric = int(body.owner_id.strip().upper().split("-")[-1])
    except (ValueError, IndexError):
        raise HTTPException(400, "Invalid owner ID format. Expected TH-MA-XXXX.")

    # Find all active cashiers for this store that are not locked out.
    candidates = db.query(Kahera).filter(
        Kahera.owner_id == owner_numeric,
        Kahera.is_active == True,
    ).all()

    if not candidates:
        raise HTTPException(404, "No active cashiers found for this store")

    # Check lockout first on any candidate (rate-limit feedback).
    now = datetime.now(timezone.utc)
    locked_out = [k for k in candidates if k.locked_until and k.locked_until > now]
    if len(locked_out) == len(candidates):
        raise HTTPException(429, "Account locked. Try again later.")

    # Try to match PIN against each unlocked candidate.
    matched = None
    for kahera in candidates:
        if kahera.locked_until and kahera.locked_until > now:
            continue
        if verify_pin(body.pin, kahera.pin_hash):
            matched = kahera
            break
        # Increment failed attempts on mismatch.
        kahera.failed_attempts += 1
        if kahera.failed_attempts >= MAX_FAILED_ATTEMPTS:
            kahera.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            kahera.failed_attempts = 0

    db.commit()

    if not matched:
        raise HTTPException(401, "Invalid Owner ID or PIN.")

    matched.failed_attempts = 0
    matched.locked_until = None
    db.commit()

    token = create_access_token({
        "sub":      str(matched.id),
        "role":     "cashier",
        "owner_id": matched.owner_id,
    })
    offline_cache = build_offline_cache_payload(matched.id, matched.pin_hash)

    return {
        "access_token":  token,
        "token_type":    "bearer",
        "full_name":     matched.full_name,
        "kahera_id":     f"TH-KH-{matched.id:04d}",
        "owner_id":      f"TH-MA-{matched.owner_id:04d}",
        "role":          "cashier",
        "expires_in":    8 * 3600,
        "offline_cache": offline_cache,
    }


# ── 4. CREATE KAHERA (May-Ari only) ──────────────────────────────────────────

@router.post("/kahera/create", status_code=201)
def create_kahera(
    body: KaheraCreateRequest,
    db:   Session = Depends(get_db),
    current_user  = Depends(require_role("owner")),
):
    """May-Ari creates a cashier account. PIN is hashed with Argon2id."""
    owner_id = current_user["db_id"]
    pin_hash = hash_pin(body.pin)

    kahera = Kahera(
        full_name      = body.full_name.strip(),
        pin_hash       = pin_hash,
        pin_hash_cache = pin_hash,
        avatar_id      = body.avatar_id,
        owner_id       = owner_id,
    )
    db.add(kahera)
    db.commit()
    db.refresh(kahera)

    return {
        "id":       f"TH-KH-{kahera.id:04d}",
        "ownerId":  f"TH-MA-{owner_id:04d}",
        "name":     kahera.full_name,
        "status":   "active",
        "avatarId": kahera.avatar_id,
    }


# ── 5. ACTIVATE / DEACTIVATE KAHERA ──────────────────────────────────────────

@router.patch("/kahera/{kahera_id}/status", response_model=OkResponse)
def toggle_kahera_status(
    kahera_id: str,
    body: KaheraStatusRequest,
    db:   Session = Depends(get_db),
    current_user  = Depends(require_role("owner")),
):
    owner_id = current_user["db_id"]
    try:
        numeric_id = int(kahera_id.strip().upper().replace("TH-KH-", ""))
    except ValueError:
        raise HTTPException(422, "Invalid cashier ID format")

    kahera = db.query(Kahera).filter(
        Kahera.id == numeric_id,
        Kahera.owner_id == owner_id,
    ).first()
    if not kahera:
        raise HTTPException(404, "Cashier not found")

    kahera.is_active = body.is_active
    if body.is_active:
        kahera.failed_attempts = 0
        kahera.locked_until    = None
    db.commit()
    return OkResponse(message=f"Cashier {'activated' if body.is_active else 'deactivated'}")


# ── 6. /ME — WHO AM I? ───────────────────────────────────────────────────────

@router.get("/me", response_model=MeResponse)
def get_me(
    db:          Session = Depends(get_db),
    current_user         = Depends(get_current_user),
):
    """
    Returns the current user's id, name and role.
    id is formatted as TH-MA-XXXX or TH-KH-XXXX.
    name is the first (display) name, not full_name.
    role is 'owner' or 'cashier'.
    """
    role     = current_user["role"]
    db_id    = current_user["db_id"]

    if role == "owner":
        owner = db.query(MayAri).filter(MayAri.id == db_id).first()
        if not owner or not owner.is_active:
            raise HTTPException(404, "Account not found or deactivated")
        return MeResponse(
            id=f"TH-MA-{owner.id:04d}",
            name=owner.full_name.split()[0],   # first name
            role="owner",
        )

    elif role == "cashier":
        kahera = db.query(Kahera).filter(Kahera.id == db_id).first()
        if not kahera or not kahera.is_active:
            raise HTTPException(404, "Account not found or deactivated")
        return MeResponse(
            id=f"TH-KH-{kahera.id:04d}",
            name=kahera.full_name.split()[0],
            role="cashier",
        )

    raise HTTPException(401, "Unknown role")
