from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models   # import so SQLAlchemy sees all models before create_all

# Create all tables on startup (safe to run repeatedly — skips existing tables)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TindaHand API",
    description="POS and inventory management for sari-sari stores",
    version="1.0.0",
)

# CORS — allows the React Native / Expo frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production to your actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.auth        import router as auth_router
from routers.inventory   import router as inventory_router
from routers.pos         import router as pos_router
from routers.expenses    import router as expenses_router
from routers.receivables import router as receivables_router
from routers.payables    import router as payables_router
from routers.dashboard   import router as dashboard_router
from routers.transactions import router as transactions_router
from routers.quick_add   import router as quick_add_router
from routers.settings    import router as settings_router

app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(pos_router)
app.include_router(expenses_router)
app.include_router(receivables_router)
app.include_router(payables_router)
app.include_router(dashboard_router)
app.include_router(transactions_router)
app.include_router(quick_add_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {"message": "TindaHand API is running 🏪"}


@app.get("/health")
def health():
    return {"status": "ok"}
