from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()  # reads your .env file

DATABASE_URL = os.getenv("DATABASE_URL")
# Example .env value:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/tindahand

engine = create_engine(DATABASE_URL)

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