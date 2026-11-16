from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DELETE FROM kahera"))
    conn.execute(text("DELETE FROM may_ari"))
    conn.commit()
    print("done")