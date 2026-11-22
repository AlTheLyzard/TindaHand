from sqlalchemy import create_engine, URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()  # reads your .env file

# Build the connection URL from individual PG vars when available (Railway),
# falling back to DATABASE_URL for local development.
_pg_host = os.getenv("PGHOST") or os.getenv("RAILWAY_PRIVATE_DOMAIN")
_pg_port = os.getenv("PGPORT", "5432")
_pg_user = os.getenv("PGUSER") or os.getenv("POSTGRES_USER")
_pg_pass = os.getenv("PGPASSWORD") or os.getenv("POSTGRES_PASSWORD")
_pg_db   = os.getenv("PGDATABASE") or os.getenv("POSTGRES_DB")

if _pg_host and _pg_user and _pg_pass and _pg_db:
    # Use SQLAlchemy's URL object to avoid any parsing issues
    _db_url = URL.create(
        drivername="postgresql+psycopg2",
        username=_pg_user,
        password=_pg_pass,
        host=_pg_host,
        port=int(_pg_port),
        database=_pg_db,
    )
else:
    # Local dev fallback
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    _db_url = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(_db_url)

# Each request gets its own session — sessions are NOT shared between requests
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All models inherit from this Base so SQLAlchemy knows about them
Base = declarative_base()


# Dependency — routes call this to get a DB session, then it auto-closes when done
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()