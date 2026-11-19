from database import engine
from sqlalchemy import text

new_hash = "$2b$12$JerhtW/ppnmFcfydaYxKJ.bvnhfOj/tuX6IhAu0Xwb2kIzbTHCnFe"

with engine.connect() as conn:
    conn.execute(text("UPDATE may_ari SET password_hash = :h WHERE id = 1"), {"h": new_hash})
    conn.commit()
    print("done")