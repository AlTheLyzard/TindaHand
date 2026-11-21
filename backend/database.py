from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()  # reads your .env file

DATABASE_URL = os.getenv("DATABASE_URL")
# Example .env value:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tindahand

# Railway provides postgresql:// URLs; force psycopg2 driver so SQLAlchemy
# doesn't try to use the psycopg v3 dialect (which isn't installed).
_db_url = DATABASE_URL
if _db_url and _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

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