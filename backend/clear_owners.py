"""Quick dev utility — deletes all may_ari rows so you can re-register with the same emails."""
from database import SessionLocal
from models import MayAri

db = SessionLocal()
count = db.query(MayAri).delete()
db.commit()
db.close()
print(f"Deleted {count} owner(s).")
