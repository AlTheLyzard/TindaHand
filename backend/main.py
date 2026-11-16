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

# Register routers
from routers import auth as auth_router
app.include_router(auth_router.router)

@app.get("/")
def root():
    return {"message": "TindaHand API is running"}