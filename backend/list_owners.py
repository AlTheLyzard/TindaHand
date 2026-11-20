from database import SessionLocal
from models import MayAri

db = SessionLocal()
owners = db.query(MayAri).all()
for o in owners:
    print(f"TH-MA-{o.id:04d}  |  {o.full_name}  |  {o.email}")
db.close()