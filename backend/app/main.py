from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import logging
import os

# ✅ Core imports
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import Base, engine

# ✅ IMPORTANT: correct model import (DO NOT use `import app.models`)
from app import models  # registers models

# ─────────────────────────────────────────────────────────────
# 🚀 App Initialization
# ─────────────────────────────────────────────────────────────
print("🔥 STARTING MAXCARE-PLUS BACKEND")
print("DATABASE_URL =", os.getenv("DATABASE_URL"))

app = FastAPI(
    title="MaxCare+ Hospital API",
    description="Complete HMS: Patients, Doctors, Appointments, Lab, Pharmacy, IPD",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────────────────────
# 📌 Logging
# ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# 📌 Database Initialization
# ─────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# Optional lightweight DB check (safe)
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        conn.commit()
    logger.info("DB connected")
except Exception as e:
    logger.warning(f"DB connection warning: {e}")

# ─────────────────────────────────────────────────────────────
# 🌐 CORS Configuration (VERY IMPORTANT)
# ─────────────────────────────────────────────────────────────
origins = [
    "https://maxcare-plus.onrender.com",  # production frontend
    "http://localhost:5173",              # local dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # or ["*"] for testing only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# 🔌 API Routes
# ─────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")

# ─────────────────────────────────────────────────────────────
# 🏠 Root Endpoint
# ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "MaxCare-Plus running"}

# ─────────────────────────────────────────────────────────────
# ❤️ Health Check (for Render / monitoring)
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "3.1.0",
        "env": settings.APP_ENV
    }