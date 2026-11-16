from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── MAY-ARI SCHEMAS ──────────────────────────────────────────────

class MayAriRegister(BaseModel):
    """What the app sends when registering a new store owner."""
    full_name: str
    email:     EmailStr
    password:  str    # bcrypt — stored for PIN recovery via email
    pin:       str    # 4-digit Argon2id — used for every login


class MayAriLogin(BaseModel):
    """What the app sends when a May-Ari logs in."""
    owner_id: str   # e.g. "TH-MA-0001"
    pin:      str   # 4-digit PIN


class MayAriOut(BaseModel):
    """What we send BACK — notice: no password_hash ever leaves the server."""
    id:        int
    full_name: str
    email:     str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True   # lets Pydantic read SQLAlchemy model objects directly


# ── KAHERA SCHEMAS ───────────────────────────────────────────────

class KaheraCreate(BaseModel):
    """May-Ari sends this to create a cashier account."""
    full_name: str
    pin:       str   # 4-6 digit PIN, plain text in transit, Argon2id-hashed before saving


class KaheraLogin(BaseModel):
    """
    What the app sends when a Kahera logs in.
    Needs both the PIN and the May-Ari ID so we know which store they belong to.
    """
    owner_id: int   # May-Ari's ID (the store they're logging into)
    pin:      str


class KaheraOut(BaseModel):
    """Cashier info returned after login — no PIN hash."""
    id:        int
    full_name: str
    is_active: bool
    owner_id:  int

    class Config:
        from_attributes = True


# ── TOKEN SCHEMAS ────────────────────────────────────────────────

class Token(BaseModel):
    """
    Returned after any successful login.
    - access_token: JWT the app stores and sends in every request header
    - token_type: always "bearer"
    - role: "may_ari" or "kahera" — the app uses this to show the right screens
    - expires_in: seconds until the token expires (token expiry feature)
    - full_name: display name for the logged-in user
    """
    access_token: str
    token_type:   str = "bearer"
    role:         str
    expires_in:   int
    full_name:    str = ""


class TokenData(BaseModel):
    """Decoded contents of a JWT — used internally by the auth middleware."""
    user_id:  Optional[int] = None
    role:     Optional[str] = None   # "may_ari" or "kahera"
    owner_id: Optional[int] = None   # only set for kahera tokens