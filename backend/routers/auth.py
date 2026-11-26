from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets, os, logging, json
import urllib.request, urllib.error

from database import get_db
from models import MayAri, Kahera, PinRecoveryToken
from auth import (
    hash_password, verify_password,
    hash_pin, verify_pin,
    create_access_token, require_role, get_current_user,
    build_offline_cache_payload,
)
from schemas import (
    RegisterRequest, LoginRequest, ReauthRequest,
    KaheraLoginRequest, KaheraLoginByPinRequest, KaheraCreateRequest, KaheraStatusRequest,
    KaheraSelfUpdateRequest,
    TokenResponse, MeResponse, OkResponse, CashierOut,
    ForgotPinRequest, ResetPinRequest,
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
        raise HTTPException(404, "May-Ari ID not found. Check your ID and try again.")

    if not verify_pin(body.pin, owner.pin_hash):
        raise HTTPException(401, "Incorrect PIN. Please try again.")

    if not owner.is_active:
        raise HTTPException(403, "Account is deactivated")

    # ← Token creation is at this indentation level, NOT inside the is_active check above
    token = create_access_token({"sub": str(owner.id), "role": "owner"})
    return TokenResponse(access_token=token, full_name=owner.full_name)


# ── 2b. MAY-ARI RE-AUTH (session refresh via email + password) ───────────────

@router.post("/reauth", response_model=TokenResponse)
def reauth(body: ReauthRequest, db: Session = Depends(get_db)):
    """
    Called when the 8-hour JWT has expired and the owner is still in the app.
    Accepts email + password (not PIN) so it works even if the owner has
    forgotten their PIN or the PIN screen is locked out.
    Returns a fresh JWT without requiring a full logout/login flow.
    """
    owner = db.query(MayAri).filter(
        MayAri.email == body.email.strip().lower(),
        MayAri.is_active == True,
    ).first()

    if not owner or not owner.password_hash:
        raise HTTPException(401, "Invalid email or password.")

    if not verify_password(body.password, owner.password_hash):
        raise HTTPException(401, "Invalid email or password.")

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
        raise HTTPException(404, "Kahera ID not found for this store. Check your May-Ari ID and Kahera ID.")

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
        raise HTTPException(401, f"Incorrect PIN. {MAX_FAILED_ATTEMPTS - kahera.failed_attempts} attempt(s) remaining.")

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
        raise HTTPException(404, "May-Ari ID not found or has no active Kahera accounts.")

    # Check lockout first on any candidate (rate-limit feedback).
    now = datetime.now(timezone.utc)
    locked_out = [k for k in candidates if k.locked_until and k.locked_until > now]
    if len(locked_out) == len(candidates):
        raise HTTPException(429, "Account locked. Try again later.")

    # Try to match PIN against each unlocked candidate.
    # Do NOT increment failed_attempts during the scan — we don't know yet
    # which Kahera the person is trying to log in as. Only the one matched
    # (on success) or all unlocked ones (on total failure) get updated.
    matched = None
    unlocked = [k for k in candidates if not (k.locked_until and k.locked_until > now)]
    for kahera in unlocked:
        if verify_pin(body.pin, kahera.pin_hash):
            matched = kahera
            break

    if matched:
        matched.failed_attempts = 0
        matched.locked_until = None
        db.commit()
    else:
        # Real failed attempt — increment every unlocked candidate equally
        # (we can't know which one was intended without a Kahera ID field).
        for kahera in unlocked:
            kahera.failed_attempts += 1
            if kahera.failed_attempts >= MAX_FAILED_ATTEMPTS:
                kahera.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                kahera.failed_attempts = 0
        db.commit()
        raise HTTPException(401, "Invalid Owner ID or PIN.")

    token = create_access_token({
        "sub":      str(matched.id),
        "role":     "cashier",
        "owner_id": matched.owner_id,
    })
    offline_cache = build_offline_cache_payload(matched.id, matched.pin_hash)

    return {
        "access_token":    token,
        "token_type":      "bearer",
        "full_name":       matched.full_name,
        "kahera_id":       f"TH-KH-{matched.id:04d}",
        "owner_id":        f"TH-MA-{matched.owner_id:04d}",
        "role":            "cashier",
        "expires_in":      8 * 3600,
        "offline_cache":   offline_cache,
        "pin_is_temporary": bool(matched.pin_is_temporary),
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


# ── 5. HAS KAHERAS (public — no JWT required) ────────────────────────────────

@router.get("/kahera/has-operators")
def has_kahera_operators(owner_id: str, db: Session = Depends(get_db)):
    """
    Public endpoint — no auth required.
    Returns { has_operators: bool } for a given owner ID (e.g. TH-MA-0001).
    Used by the Choose Account screen to decide whether to show the Kahera login card.
    """
    try:
        numeric_id = int(owner_id.strip().upper().split("-")[-1])
    except (ValueError, IndexError):
        return {"has_operators": False}

    count = db.query(Kahera).filter(
        Kahera.owner_id == numeric_id,
        Kahera.is_active == True,
    ).count()
    return {"has_operators": count > 0}


# ── 6. HAS ACCOUNTS (public — no JWT required) ───────────────────────────────

@router.get("/has-accounts")
def has_accounts(db: Session = Depends(get_db)):
    """
    Public endpoint — no auth required.
    Returns { has_owners: bool, has_kaheras: bool }.
    Used by the Choose Account screen on first load so it can show the right
    cards even before any login has happened on this device.
    """
    has_owners  = db.query(MayAri).filter(MayAri.is_active == True).count() > 0
    has_kaheras = db.query(Kahera).filter(Kahera.is_active == True).count() > 0
    return {"has_owners": has_owners, "has_kaheras": has_kaheras}


# ── 7. LIST KAHERAS ──────────────────────────────────────────────────────────

@router.get("/kahera/list")
def list_kaheras(
    db:          Session = Depends(get_db),
    current_user = Depends(require_role("owner")),
):
    """Return all Kahera accounts belonging to the logged-in owner."""
    owner_id = current_user["db_id"]
    kaheras = db.query(Kahera).filter(Kahera.owner_id == owner_id).all()
    return [
        {
            "id":       f"TH-KH-{k.id:04d}",
            "ownerId":  f"TH-MA-{owner_id:04d}",
            "name":     k.full_name,
            "status":   "active" if k.is_active else "inactive",
            "avatarId": k.avatar_id,
        }
        for k in kaheras
    ]


# ── 6. ACTIVATE / DEACTIVATE KAHERA ──────────────────────────────────────────

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


# ── 6. KAHERA SELF-SERVICE PROFILE UPDATE ────────────────────────────────────

@router.patch("/kahera/me", response_model=CashierOut)
def update_kahera_me(
    body: KaheraSelfUpdateRequest,
    db:   Session = Depends(get_db),
    current_user  = Depends(require_role("cashier")),
):
    """
    Kahera updates her own name and/or avatar.
    Uses the Kahera's own JWT — no owner token required.
    """
    kahera_id = current_user["db_id"]       # int — from JWT "sub"
    owner_db_id = current_user.get("owner_db_id")  # int — from JWT "owner_id" claim

    kahera = db.query(Kahera).filter(Kahera.id == kahera_id).first()
    if not kahera:
        raise HTTPException(404, "Kahera not found")

    if body.full_name is not None:
        full_name = body.full_name.strip()
        if not full_name:
            raise HTTPException(422, "Name cannot be empty")
        kahera.full_name = full_name
    if body.avatar_id is not None:
        kahera.avatar_id = body.avatar_id

    db.commit()
    db.refresh(kahera)

    resolved_owner_id = owner_db_id if owner_db_id is not None else kahera.owner_id
    return CashierOut(
        id=f"TH-KH-{kahera.id:04d}",
        ownerId=f"TH-MA-{resolved_owner_id:04d}",
        name=kahera.full_name,
        status="active" if kahera.is_active else "inactive",
        avatarId=kahera.avatar_id,
    )


# ── 7. /ME — WHO AM I? ───────────────────────────────────────────────────────

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
        perms = json.loads(kahera.permissions_json) if kahera.permissions_json else []
        return MeResponse(
            id=f"TH-KH-{kahera.id:04d}",
            name=kahera.full_name.split()[0],
            role="cashier",
            permissions=perms,
        )

    raise HTTPException(401, "Unknown role")


# ── PIN RECOVERY ─────────────────────────────────────────────────────────────

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# From address — must be a verified domain in Resend.
# "onboarding@resend.dev" works on Resend's free tier without domain verification.
RESEND_FROM    = os.getenv("RESEND_FROM", "TindaHand <onboarding@resend.dev>")

# Deep-link base for the recovery email.
# Dev builds: "tindahand:/" → link becomes tindahand://reset-pin?token=...
APP_DEEP_LINK_BASE = os.getenv("APP_DEEP_LINK_BASE",
                                os.getenv("APP_BASE_URL", "tindahand:/"))

def _send_recovery_email(to_email: str, owner_name: str, token: str):
    """Send the PIN recovery link via Resend HTTPS API (works on Railway)."""
    reset_link = f"{APP_DEEP_LINK_BASE}/reset-pin?token={token}"

    plain = (
        f"Hi {owner_name},\n\n"
        f"We received a request to reset the PIN for your TindaHand Owner account.\n\n"
        f"Tap the link below on your phone to open the TindaHand app and create a new PIN.\n"
        f"Link expires in 15 minutes.\n\n"
        f"{reset_link}\n\n"
        f"If the link does not open the app, open TindaHand on your phone, go to Forgot PIN,\n"
        f"and enter this recovery code when prompted:\n\n"
        f"  {token}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"— TindaHand"
    )
    html = f"""
    <html><body style="font-family:sans-serif;color:#102342;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#2675DB">PIN Recovery</h2>
      <p>Hi {owner_name},</p>
      <p>We received a request to reset the PIN for your TindaHand Owner account.</p>
      <p><strong>Tap the button below on your phone</strong> to open the TindaHand app and create a new PIN.</p>
      <p>
        <a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#2675DB;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Reset My PIN
        </a>
      </p>
      <p style="color:#666;font-size:12px">Link expires in 15 minutes. If you did not request this, ignore this email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:11px">TindaHand &mdash; POS for sari-sari stores</p>
    </body></html>
    """

    if not RESEND_API_KEY:
        logging.error("RESEND_API_KEY is not set — cannot send recovery email")
        raise RuntimeError("Email service not configured")

    payload = json.dumps({
        "from":    RESEND_FROM,
        "to":      [to_email],
        "subject": "TindaHand — PIN Recovery",
        "text":    plain,
        "html":    html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type":  "application/json",
            "User-Agent":    "TindaHand/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read()
            logging.info(f"Resend response {resp.status}: {body[:200]}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        logging.error(f"Resend HTTP {e.code}: {err_body}")
        raise


@router.post("/forgot-pin")
def forgot_pin(body: ForgotPinRequest, db: Session = Depends(get_db)):
    """
    Request a PIN recovery email.
    Returns 200 with found=True when the email matches an active account,
    or found=False when it does not (so the UI can show an appropriate message).
    Resend cooldown: 30 seconds.
    """
    resend_at = int((datetime.now(timezone.utc) + timedelta(seconds=30)).timestamp() * 1000)

    owner = db.query(MayAri).filter(
        MayAri.email == body.email.strip().lower(),
        MayAri.is_active == True,
    ).first()

    if not owner:
        return {"found": False, "resendAt": resend_at}

    # Invalidate previous unused tokens for this owner
    db.query(PinRecoveryToken).filter(
        PinRecoveryToken.owner_id == owner.id,
        PinRecoveryToken.used == False,
    ).update({"used": True})

    token = secrets.token_hex(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.add(PinRecoveryToken(id=token, owner_id=owner.id, used=False, expires_at=expires_at))
    db.commit()

    try:
        first_name = owner.full_name.split()[0]
        _send_recovery_email(owner.email, first_name, token)
    except Exception as e:
        import logging
        logging.error(f"Failed to send recovery email to {owner.email}: {e}")

    return {"found": True, "resendAt": resend_at}


@router.get("/verify-recovery/{token}")
def verify_recovery(token: str, db: Session = Depends(get_db)):
    """Check if a recovery token is valid and not expired."""
    record = db.query(PinRecoveryToken).filter(PinRecoveryToken.id == token).first()
    now = datetime.now(timezone.utc)

    if not record or record.used:
        raise HTTPException(400, "This recovery link is invalid or has already been used.")
    if record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(400, "This recovery link has expired. Please request a new one.")

    expires_ms = int(record.expires_at.replace(tzinfo=timezone.utc).timestamp() * 1000)
    return {"expiresAt": expires_ms}


@router.post("/reset-pin")
def reset_pin(body: ResetPinRequest, db: Session = Depends(get_db)):
    """Consume a recovery token and set a new PIN."""
    record = db.query(PinRecoveryToken).filter(PinRecoveryToken.id == body.token).first()
    now = datetime.now(timezone.utc)

    if not record or record.used:
        raise HTTPException(400, "This recovery link is invalid or has already been used.")
    if record.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(400, "This recovery link has expired. Please request a new one.")
    if not body.pin or not body.pin.isdigit() or len(body.pin) != 4:
        raise HTTPException(422, "PIN must be exactly 4 numeric digits.")

    owner = db.query(MayAri).filter(MayAri.id == record.owner_id).first()
    if not owner or not owner.is_active:
        raise HTTPException(400, "Account not found or deactivated.")

    owner.pin_hash = hash_pin(body.pin)
    record.used = True
    db.commit()

    return {"ok": True}
