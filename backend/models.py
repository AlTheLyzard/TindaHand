from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class MayAri(Base):
    """
    Store owner account.
    - password_hash: bcrypt hash of their password (never plain text)
    - is_active: owner can deactivate their own account if compromised
    """
    __tablename__ = "may_ari"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(100), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)   # bcrypt — for PIN recovery only
    pin_hash      = Column(String(255), nullable=True)    # Argon2id — for every login
    is_active     = Column(Boolean, default=True)         # account activation/deactivation
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    # One May-Ari can have many Kahera accounts
    kaheras = relationship("Kahera", back_populates="owner", cascade="all, delete-orphan")


class Kahera(Base):
    """
    Cashier account — always linked to a May-Ari (store owner).

    - pin_hash: Argon2id hash of their 4-6 digit PIN (not stored plain)
    - is_active: May-Ari can instantly disable a cashier (e.g. employee leaves)
    - pin_hash_cache: securely stored hash copy used for offline login
      (the app checks this when there's no internet connection)
    - failed_attempts / locked_until: brute-force protection on PIN entry
    """
    __tablename__ = "kahera"

    id             = Column(Integer, primary_key=True, index=True)
    full_name      = Column(String(100), nullable=False)
    pin_hash       = Column(String(255), nullable=False)   # Argon2id hash of PIN
    is_active      = Column(Boolean, default=True)         # account activation/deactivation
    pin_hash_cache = Column(Text, nullable=True)           # offline login cache (encrypted copy)
    failed_attempts = Column(Integer, default=0)           # brute-force counter
    locked_until   = Column(DateTime(timezone=True), nullable=True)  # lockout expiry
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), onupdate=func.now())

    # FK → which store owner this cashier belongs to
    owner_id = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    owner    = relationship("MayAri", back_populates="kaheras")
    