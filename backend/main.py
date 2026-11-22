import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models   # import so SQLAlchemy sees all models before create_all

logging.basicConfig(level=logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retry create_all so Railway's internal DNS has time to resolve
    for attempt in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            logging.info("Database tables ready.")
            break
        except Exception as e:
            logging.warning(f"DB not ready (attempt {attempt + 1}/10): {e}")
            time.sleep(3)
    else:
        logging.error("Could not connect to database after 10 attempts.")
    yield


app = FastAPI(
    lifespan=lifespan,
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
from routers.classify    import router as classify_router

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
app.include_router(classify_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import json
    body = await request.body()
    logging.error("=== 422 VALIDATION ERROR ===")
    logging.error(f"Path: {request.url.path}")
    logging.error(f"Errors: {json.dumps(exc.errors(), indent=2)}")
    try:
        logging.error(f"Body: {body.decode('utf-8')[:2000]}")
    except Exception:
        logging.error(f"Body (raw): {body[:500]}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.get("/")
def root():
    return {"message": "TindaHand API is running 🏪"}


@app.get("/health")
def health():
    return {"status": "ok"}
