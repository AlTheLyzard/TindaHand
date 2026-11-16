from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from argon2 import PasswordHasher as _Argon2Hasher
from argon2.exceptions import VerifyMismatchError as _VerifyMismatchError

import os

from database import get_db
from schemas import TokenData

# ── CONFIGURATION ────────────────────────────────────────────────

SECRET_KEY    = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM     = "HS256"
# Token expiry: 8 hours = one full work shift.
# After this, the cashier/owner must log in again.
# This limits damage if a device is lost/stolen mid-shift.
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", 8))

# ── HASHING SETUP ────────────────────────────────────────────────

import bcrypt as _bcrypt

_argon2 = _Argon2Hasher()   # Argon2id by default — best for short inputs like PINs

# Argon2id for Kahera PINs:
# - memory-hard, so brute-forcing a 4-6 digit PIN is very slow even with the DB
# - Winner of the 2015 Password Hashing Competition


def hash_password(plain: str) -> str:
    """Hash a May-Ari password with bcrypt."""
    return _bcrypt.hashpw(plain[:72].encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain password against a bcrypt hash."""
    return _bcrypt.checkpw(plain[:72].encode(), hashed.encode())


def hash_pin(plain_pin: str) -> str:
    """Hash a Kahera PIN with Argon2id."""
    return _argon2.hash(plain_pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """Check a plain PIN against an Argon2id hash."""
    try:
        return _argon2.verify(hashed_pin, plain_pin)
    except _VerifyMismatchError:
        return False

# ── JWT TOKENS ───────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT.
    - 'sub' = user ID
    - 'role' = "may_ari" or "kahera" (used by RBAC gate)
    - 'exp' = expiry timestamp (token expiry feature)
    The token is signed with SECRET_KEY — any tampering invalidates it.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenData:
    """
    Decode and validate a JWT from a request header.
    Raises 401 if the token is invalid, expired, or tampered with.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int  = payload.get("sub")
        role: str     = payload.get("role")
        owner_id: int = payload.get("owner_id")   # only present in kahera tokens

        if user_id is None or role is None:
            raise credentials_exception

        return TokenData(user_id=user_id, role=role, owner_id=owner_id)

    except JWTError:
        raise credentials_exception


# ── RBAC GATE MIDDLEWARE ─────────────────────────────────────────

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenData:
    """
    Extracts and validates the JWT from the Authorization header.
    Every protected route depends on this.
    """
    return decode_token(credentials.credentials)


def require_role(*allowed_roles: str):
    """
    RBAC Gate — returns a FastAPI dependency that blocks any role not in allowed_roles.

    Usage in a route:
        @router.get("/owner-only")
        def owner_only(user = Depends(require_role("may_ari"))):
            ...

        @router.get("/both-can-access")
        def both(user = Depends(require_role("may_ari", "kahera"))):
            ...

    Why: Instead of checking roles inside every function body, we declare
    access rules at the route level — cleaner and harder to accidentally skip.
    """
    def _gate(user: TokenData = Depends(get_current_user)) -> TokenData:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {' or '.join(allowed_roles)}"
            )
        return user
    return _gate


# ── OFFLINE LOGIN CACHE HELPER ───────────────────────────────────

def build_offline_cache_payload(kahera_id: int, pin_hash: str) -> dict:
    """
    Returns a dict the mobile app stores locally (encrypted on-device).
    When offline, the app hashes the entered PIN and compares against
    pin_hash_cache in the local store — no server call needed.

    The app is responsible for:
    - Encrypting this payload with the device's secure enclave / keystore
    - Only using it when the server is unreachable
    - Wiping it when the cashier is deactivated (synced next time online)
    """
    return {
        "kahera_id":     kahera_id,
        "pin_hash_cache": pin_hash,   # Argon2id hash — safe to store locally
        "cached_at":     datetime.now(timezone.utc).isoformat(),
    }

