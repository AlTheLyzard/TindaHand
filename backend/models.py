from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, BigInteger,
    ForeignKey, Text, Numeric, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ── ENUMS ────────────────────────────────────────────────────────────────────

class ProductCategory(str, enum.Enum):
    drinks       = "drinks"
    canned       = "canned"
    snacks       = "snacks"
    coldCuts     = "coldCuts"
    groceries    = "groceries"
    household    = "household"
    personalCare = "personalCare"

class AssetClassification(str, enum.Enum):
    current   = "current"
    equipment = "equipment"
    furniture = "furniture"

class PaymentMethod(str, enum.Enum):
    cash    = "cash"
    gcash   = "gcash"
    split   = "split"
    partial = "partial"

class PaymentStatus(str, enum.Enum):
    paid    = "paid"
    partial = "partial"
    unpaid  = "unpaid"

class QuickAddKind(str, enum.Enum):
    customerDebt = "customerDebt"
    storeDebt    = "storeDebt"
    expense      = "expense"

class BorrowingKind(str, enum.Enum):
    cash    = "cash"
    product = "product"


# ── ACCOUNTS ─────────────────────────────────────────────────────────────────

class MayAri(Base):
    """
    Store owner account.
    password_hash — bcrypt, used for PIN recovery via email
    pin_hash      — Argon2id, used for every day-to-day login
    """
    __tablename__ = "may_ari"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(100), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    pin_hash      = Column(String(255), nullable=True)
    store_name    = Column(String(100), nullable=True)
    avatar_id     = Column(String(20), nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    kaheras          = relationship("Kahera",       back_populates="owner", cascade="all, delete-orphan")
    products         = relationship("Product",      back_populates="owner", cascade="all, delete-orphan")
    assets           = relationship("Asset",        back_populates="owner", cascade="all, delete-orphan")
    sales            = relationship("Sale",         back_populates="owner", cascade="all, delete-orphan")
    expenses         = relationship("Expense",      back_populates="owner", cascade="all, delete-orphan")
    customer_debts   = relationship("CustomerDebt", back_populates="owner", cascade="all, delete-orphan")
    store_creditors  = relationship("StoreCreditor",back_populates="owner", cascade="all, delete-orphan")
    cash_movements   = relationship("CashMovement", back_populates="owner", cascade="all, delete-orphan")


class Kahera(Base):
    """
    Cashier account — always belongs to one May-Ari.
    pin_hash       — Argon2id
    failed_attempts / locked_until — brute-force protection
    """
    __tablename__ = "kahera"

    id              = Column(Integer, primary_key=True, index=True)
    full_name       = Column(String(100), nullable=False)
    pin_hash        = Column(String(255), nullable=False)
    avatar_id       = Column(String(20), nullable=True)
    is_active       = Column(Boolean, default=True)
    pin_hash_cache  = Column(Text, nullable=True)
    failed_attempts = Column(Integer, default=0)
    locked_until    = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    owner_id = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    owner    = relationship("MayAri", back_populates="kaheras")

    # Permissions stored as a JSON-encoded list in a text column (simple and portable)
    permissions_json = Column(Text, nullable=True)   # e.g. '["pos","receivables"]'


# ── INVENTORY ────────────────────────────────────────────────────────────────

class Product(Base):
    """
    One SKU in a store owner's catalog.
    stock is the sum of all active batch quantities; kept denormalized for fast reads.
    unit_price_centavos / cost_centavos are integer Philippine centavos (never floats).
    """
    __tablename__ = "product"

    id                  = Column(String(50), primary_key=True)
    owner_id            = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    name                = Column(String(200), nullable=False)
    category            = Column(SAEnum(ProductCategory), nullable=False)
    unit_price_centavos = Column(BigInteger, nullable=False)
    cost_centavos       = Column(BigInteger, nullable=False)
    stock               = Column(Integer, nullable=False, default=0)
    expiration_date     = Column(String(10), nullable=True)   # YYYY-MM-DD or YYYY-MM
    photo_uri           = Column(Text, nullable=True)
    is_deleted          = Column(Boolean, default=False)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    owner    = relationship("MayAri",      back_populates="products")
    batches  = relationship("StockBatch",  back_populates="product", cascade="all, delete-orphan")
    restocks = relationship("Restock",     back_populates="product")
    sale_lines = relationship("SaleLine",  back_populates="product")


class StockBatch(Base):
    """
    One delivery batch within a product.
    Products can have multiple batches with different expiry dates (FEFO picking).
    noExpiry=True means the batch never expires (e.g. household supplies).
    """
    __tablename__ = "stock_batch"

    id              = Column(String(50), primary_key=True)
    product_id      = Column(String(50), ForeignKey("product.id"), nullable=False)
    quantity        = Column(Integer, nullable=False, default=0)
    no_expiry       = Column(Boolean, nullable=False, default=False)
    expiration_date = Column(String(10), nullable=True)   # null when no_expiry=True
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="batches")


class Restock(Base):
    """
    One incoming stock delivery for a product.
    Keeps a permanent log of when stock arrived and at what expiry.
    """
    __tablename__ = "restock"

    id              = Column(String(50), primary_key=True)
    owner_id        = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    product_id      = Column(String(50), ForeignKey("product.id"), nullable=False)
    item_name       = Column(String(200), nullable=False)   # snapshot of name at restock time
    quantity        = Column(Integer, nullable=False)
    stock_date      = Column(String(10), nullable=False)    # YYYY-MM-DD
    expiration_date = Column(String(10), nullable=False)
    recorded_at     = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="restocks")


class Asset(Base):
    """
    A business asset owned by a store (e.g. refrigerator, shelves, cash on hand).
    value_centavos and useful_life_years are used to compute depreciation.
    """
    __tablename__ = "asset"

    id                 = Column(String(50), primary_key=True)
    owner_id           = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    name               = Column(String(200), nullable=False)
    value_centavos     = Column(BigInteger, nullable=False)
    useful_life_years  = Column(Integer, nullable=False, default=0)
    classification     = Column(SAEnum(AssetClassification), nullable=False)
    recorded_date      = Column(String(10), nullable=False)   # YYYY-MM-DD
    is_deleted         = Column(Boolean, default=False)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("MayAri", back_populates="assets")


# ── POINT OF SALE ────────────────────────────────────────────────────────────

class Customer(Base):
    """
    A named customer known to a store (created during checkout or Quick Add).
    """
    __tablename__ = "customer"

    id         = Column(String(50), primary_key=True)
    owner_id   = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    name       = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sales = relationship("Sale",         back_populates="customer")
    debts = relationship("CustomerDebt", back_populates="customer")


class Sale(Base):
    """
    One completed POS checkout.
    total_centavos       — full cart total
    remaining_centavos   — unpaid portion (0 if fully paid)
    payment_status       — paid / partial / unpaid
    """
    __tablename__ = "sale"

    id                 = Column(String(50), primary_key=True)
    owner_id           = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    kahera_id          = Column(Integer, ForeignKey("kahera.id"), nullable=True)
    customer_id        = Column(String(50), ForeignKey("customer.id"), nullable=True)
    total_centavos     = Column(BigInteger, nullable=False)
    remaining_centavos = Column(BigInteger, nullable=False, default=0)
    payment_status     = Column(SAEnum(PaymentStatus), nullable=False, default=PaymentStatus.paid)
    payment_method     = Column(SAEnum(PaymentMethod), nullable=True)
    occurred_at        = Column(DateTime(timezone=True), nullable=False)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    owner    = relationship("MayAri", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    lines    = relationship("SaleLine",    back_populates="sale", cascade="all, delete-orphan")
    tenders  = relationship("SaleTender",  back_populates="sale", cascade="all, delete-orphan")


class SaleLine(Base):
    """
    One product line within a sale.
    item_name and unit_price_centavos are snapshots — they never change even if the
    product is later edited or deleted.
    """
    __tablename__ = "sale_line"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    sale_id             = Column(String(50), ForeignKey("sale.id"), nullable=False)
    product_id          = Column(String(50), ForeignKey("product.id"), nullable=True)
    item_name           = Column(String(200), nullable=False)   # snapshot
    unit_price_centavos = Column(BigInteger, nullable=False)    # snapshot
    quantity            = Column(Integer, nullable=False)

    sale    = relationship("Sale",    back_populates="lines")
    product = relationship("Product", back_populates="sale_lines")


class SaleTender(Base):
    """
    One payment tender within a sale (a sale can have both cash and GCash tenders).
    received_centavos — what the customer gave
    reference         — GCash reference number, if any
    """
    __tablename__ = "sale_tender"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    sale_id           = Column(String(50), ForeignKey("sale.id"), nullable=False)
    method            = Column(String(10), nullable=False)   # 'cash' or 'gcash'
    received_centavos = Column(BigInteger, nullable=False)
    reference         = Column(String(100), nullable=True)

    sale = relationship("Sale", back_populates="tenders")


# ── ACCOUNTS RECEIVABLE (customer debts) ─────────────────────────────────────

class CustomerDebt(Base):
    """
    Money a customer owes the store (from Quick Add or a partial POS sale).
    original_amount_centavos — the full debt at creation
    amount_centavos          — remaining unpaid amount
    sale_id                  — set when this debt came from a POS partial payment
    """
    __tablename__ = "customer_debt"

    id                       = Column(String(50), primary_key=True)
    owner_id                 = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    customer_id              = Column(String(50), ForeignKey("customer.id"), nullable=True)
    sale_id                  = Column(String(50), ForeignKey("sale.id"), nullable=True)
    name                     = Column(String(200), nullable=False)   # customer name snapshot
    original_amount_centavos = Column(BigInteger, nullable=False)
    amount_centavos          = Column(BigInteger, nullable=False)
    borrowing                = Column(SAEnum(BorrowingKind), nullable=True)
    due_date                 = Column(String(10), nullable=True)
    details                  = Column(Text, nullable=True)
    payment_status           = Column(SAEnum(PaymentStatus), nullable=False, default=PaymentStatus.unpaid)
    occurred_at              = Column(DateTime(timezone=True), nullable=False)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())

    owner    = relationship("MayAri",   back_populates="customer_debts")
    customer = relationship("Customer", back_populates="debts")
    payments = relationship("DebtPayment", back_populates="debt", cascade="all, delete-orphan")


class DebtPayment(Base):
    """
    One payment made against a customer debt (accounts receivable collection).
    """
    __tablename__ = "debt_payment"

    id              = Column(String(50), primary_key=True)
    owner_id        = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    debt_id         = Column(String(50), ForeignKey("customer_debt.id"), nullable=False)
    amount_centavos = Column(BigInteger, nullable=False)
    reference       = Column(String(100), nullable=True)
    occurred_at     = Column(DateTime(timezone=True), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    debt = relationship("CustomerDebt", back_populates="payments")


# ── ACCOUNTS PAYABLE (store debts) ──────────────────────────────────────────

class StoreCreditor(Base):
    """
    A supplier or person the store owes money to.
    One creditor can have many debts over time.
    """
    __tablename__ = "store_creditor"

    id         = Column(String(50), primary_key=True)
    owner_id   = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    name       = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("MayAri",    back_populates="store_creditors")
    debts = relationship("StoreDebt", back_populates="creditor")


class StoreDebt(Base):
    """
    Money the store owes a creditor (accounts payable).
    original_amount_centavos — full amount at creation
    """
    __tablename__ = "store_debt"

    id                       = Column(String(50), primary_key=True)
    owner_id                 = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    creditor_id              = Column(String(50), ForeignKey("store_creditor.id"), nullable=False)
    name                     = Column(String(200), nullable=False)   # creditor name snapshot
    original_amount_centavos = Column(BigInteger, nullable=False)
    due_date                 = Column(String(10), nullable=True)
    details                  = Column(Text, nullable=True)
    occurred_at              = Column(DateTime(timezone=True), nullable=False)
    created_at               = Column(DateTime(timezone=True), server_default=func.now())

    creditor = relationship("StoreCreditor", back_populates="debts")
    payments = relationship("StoreDebtPayment", back_populates="debt", cascade="all, delete-orphan")


class StoreDebtPayment(Base):
    """
    One payment made against a store debt (accounts payable settlement).
    """
    __tablename__ = "store_debt_payment"

    id              = Column(String(50), primary_key=True)
    owner_id        = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    debt_id         = Column(String(50), ForeignKey("store_debt.id"), nullable=False)
    amount_centavos = Column(BigInteger, nullable=False)
    occurred_at     = Column(DateTime(timezone=True), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    debt = relationship("StoreDebt", back_populates="payments")


# ── EXPENSES ─────────────────────────────────────────────────────────────────

class Expense(Base):
    """
    A store operating expense (electricity, water, supplies, etc.).
    category    — one of the fixed expense categories (Electricity Expense, etc.)
    expense_date — calendar date the expense was incurred (not the timestamp)
    """
    __tablename__ = "expense"

    id              = Column(String(50), primary_key=True)
    owner_id        = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    name            = Column(String(200), nullable=False)
    category        = Column(String(100), nullable=True)
    amount_centavos = Column(BigInteger, nullable=False)
    details         = Column(Text, nullable=True)
    expense_date    = Column(String(10), nullable=False)   # YYYY-MM-DD
    occurred_at     = Column(DateTime(timezone=True), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("MayAri", back_populates="expenses")


# ── CASH REGISTER ────────────────────────────────────────────────────────────

class CashMovement(Base):
    """
    A manual cash addition recorded by the owner from the dashboard.
    amount_centavos is always positive (cash added, not removed).
    """
    __tablename__ = "cash_movement"

    id              = Column(String(50), primary_key=True)
    owner_id        = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    amount_centavos = Column(BigInteger, nullable=False)
    occurred_at     = Column(DateTime(timezone=True), nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("MayAri", back_populates="cash_movements")


# ── PIN RECOVERY ─────────────────────────────────────────────────────────────

class PinRecoveryToken(Base):
    """
    A short-lived token emailed to the owner for PIN reset.
    Tokens expire after 15 minutes and are single-use.
    """
    __tablename__ = "pin_recovery_token"

    id         = Column(String(64), primary_key=True)   # random hex token
    owner_id   = Column(Integer, ForeignKey("may_ari.id"), nullable=False)
    used       = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
