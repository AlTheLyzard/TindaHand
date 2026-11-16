from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import MayAri, Kahera
from schemas import (
    MayAriRegister, MayAriLogin, MayAriOut,
    KaheraCreate, KaheraLogin, KaheraOut,
    Token
)
from auth import (
    hash_password, verify_password,
    hash_pin, verify_pin,
    create_access_token, require_role, get_current_user,
    build_offline_cache_payload
)
from schemas import TokenData

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_FAILED_ATTEMPTS = 5   # lock account after 5 wrong PINs
LOCKOUT_MINUTES     = 15  # locked for 15 minutes


# ── 1. REGISTER (May-Ari only) ───────────────────────────────────

@router.post("/register", response_model=None, status_code=201)
def register(payload: MayAriRegister, db: Session = Depends(get_db)):
    """
    Create a new store owner account.
    Password is hashed with bcrypt before saving — plain text never touches the DB.
    """
    existing = db.query(MayAri).filter(MayAri.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    owner = MayAri(
        full_name     = payload.full_name,
        email         = payload.email,
        password_hash = hash_password(payload.password),
        pin_hash      = hash_pin(payload.pin),
    )

    db.add(owner)
    db.commit()
    db.refresh(owner)
    token = create_access_token({"sub": str(owner.id), "role": "may_ari"})
    return {
        "id": owner.id,
        "full_name": owner.full_name,
        "email": owner.email,
        "is_active": owner.is_active,
        "created_at": owner.created_at,
        "access_token": token,
    }


# ── 2. MAY-ARI LOGIN ─────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login_may_ari(payload: MayAriLogin, db: Session = Depends(get_db)):
    """
    May-Ari logs in with their display ID (TH-MA-0001) + 4-digit PIN.
    Password is only used for PIN recovery via email, not for login.
    """
    try:
        numeric_id = int(payload.owner_id.split("-")[-1])
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid owner ID format. Expected TH-MA-XXXX.")

    owner = db.query(MayAri).filter(MayAri.id == numeric_id).first()

    if not owner or not verify_pin(payload.pin, owner.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid ID or PIN")

    if not owner.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": str(owner.id), "role": "may_ari"})
    return Token(access_token=token, role="may_ari", expires_in=8 * 3600, full_name=owner.full_name)

# ── 3. KAHERA LOGIN ──────────────────────────────────────────────

@router.post("/kahera/login", response_model=Token)
def login_kahera(payload: KaheraLogin, db: Session = Depends(get_db)):
    """
    Cashier logs in with their PIN + May-Ari's ID.
    - Checks account is active (activation/deactivation feature)
    - Checks for brute-force lockout
    - Verifies PIN against Argon2id hash
    - Returns JWT with role='kahera' and owner_id embedded
    - Returns offline cache payload so app can store it for offline login
    """
    kahera = db.query(Kahera).filter(
        Kahera.owner_id == payload.owner_id
    ).first()

    if not kahera:
        raise HTTPException(status_code=404, detail="Cashier not found for this store")

    # Account activation check
    if not kahera.is_active:
        raise HTTPException(status_code=403, detail="This cashier account has been deactivated")

    # Brute-force lockout check
    if kahera.locked_until and kahera.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=429,
            detail=f"Account locked due to too many failed attempts. Try again after {kahera.locked_until.strftime('%H:%M')} UTC"
        )

    # Verify PIN (Argon2id)
    if not verify_pin(payload.pin, kahera.pin_hash):
        kahera.failed_attempts += 1
        if kahera.failed_attempts >= MAX_FAILED_ATTEMPTS:
            from datetime import timedelta
            kahera.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            kahera.failed_attempts = 0
            db.commit()
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.")
        db.commit()
        raise HTTPException(status_code=401, detail=f"Invalid PIN. {MAX_FAILED_ATTEMPTS - kahera.failed_attempts} attempts remaining.")

    # PIN correct — reset failed attempts
    kahera.failed_attempts = 0
    kahera.locked_until    = None
    db.commit()

    token = create_access_token({
        "sub":      str(kahera.id),
        "role":     "kahera",
        "owner_id": kahera.owner_id,   # embedded so routes know which store
    })

    # Build offline cache payload (app encrypts and stores this locally)
    offline_cache = build_offline_cache_payload(kahera.id, kahera.pin_hash)

    return {
        "access_token":  token,
        "token_type":    "bearer",
        "role":          "kahera",
        "expires_in":    8 * 3600,
        "offline_cache": offline_cache,   # app stores this for offline login
    }


# ── 4. CREATE KAHERA (May-Ari only) ─────────────────────────────

@router.post("/kahera/create", response_model=KaheraOut, status_code=201)
def create_kahera(
    payload: KaheraCreate,
    db:   Session   = Depends(get_db),
    user: TokenData = Depends(require_role("may_ari")),   # RBAC gate: only owners
):
    """
    May-Ari creates a cashier account.
    PIN is hashed with Argon2id before saving.
    RBAC gate ensures only a logged-in May-Ari can call this.
    """
    kahera = Kahera(
        full_name      = payload.full_name,
        pin_hash       = hash_pin(payload.pin),   # Argon2id hash
        owner_id       = user.user_id,
        pin_hash_cache = hash_pin(payload.pin),   # same hash stored for offline use
    )
    db.add(kahera)
    db.commit()
    db.refresh(kahera)
    return kahera


# ── 5. ACTIVATE / DEACTIVATE KAHERA (May-Ari only) ──────────────

@router.patch("/kahera/{kahera_id}/status", response_model=KaheraOut)
def toggle_kahera_status(
    kahera_id: int,
    is_active: bool,
    db:   Session   = Depends(get_db),
    user: TokenData = Depends(require_role("may_ari")),   # RBAC gate
):
    """
    Instantly enable or disable a cashier account.
    Use case: employee leaves, account is compromised, end of employment.
    RBAC gate: only the owning May-Ari can do this.
    """
    kahera = db.query(Kahera).filter(
        Kahera.id == kahera_id,
        Kahera.owner_id == user.user_id   # can only manage YOUR cashiers
    ).first()

    if not kahera:
        raise HTTPException(status_code=404, detail="Cashier not found")

    kahera.is_active = is_active
    db.commit()
    db.refresh(kahera)
    return kahera


# ── 6. /ME — WHO AM I? ──────────────────────────────────────────

@router.get("/me")
def get_me(
    db:   Session   = Depends(get_db),
    user: TokenData = Depends(get_current_user),
):
    """
    Returns the currently logged-in user's info based on their JWT.
    Frontend calls this on app load to restore session state.
    Works for both roles.
    """
    if user.role == "may_ari":
        owner = db.query(MayAri).filter(MayAri.id == user.user_id).first()
        if not owner or not owner.is_active:
            raise HTTPException(status_code=404, detail="Account not found or deactivated")
        return {"id": owner.id, "name": owner.full_name, "role": "may_ari", "email": owner.email}

    elif user.role == "kahera":
        kahera = db.query(Kahera).filter(Kahera.id == user.user_id).first()
        if not kahera or not kahera.is_active:
            raise HTTPException(status_code=404, detail="Account not found or deactivated")
        return {"id": kahera.id, "name": kahera.full_name, "role": "kahera", "owner_id": kahera.owner_id}


