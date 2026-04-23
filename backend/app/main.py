from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import logging
import os

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import Base, engine

print("🔥 STARTING MAXCARE-PLUS BACKEND")
print("DATABASE_URL =", os.getenv("DATABASE_URL"))

# ✅ SINGLE app instance
app = FastAPI(
    title="MaxCare+ Hospital API",
    version="3.1.0"
)

# ✅ Root route
@app.get("/")
def root():
    return {"status": "MaxCare-Plus running"}

# ✅ Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Register models
import app.models

# ✅ Create tables
Base.metadata.create_all(bind=engine)

# ✅ Migrations
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        conn.commit()
    logger.info("DB connected")
except Exception as e:
    logger.warning(f"DB warning: {e}")

# ✅ CORS (VERY IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://maxcare-plus.onrender.com",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Router
app.include_router(api_router, prefix="/api/v1")

# ✅ Health
@app.get("/health")
def health():
    return {"status": "ok"}