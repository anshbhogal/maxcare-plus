from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import Base, engine
from sqlalchemy import text
import logging
import os

print("🔥 STARTING MAXCARE-PLUS BACKEND")
print("DATABASE_URL =", os.getenv("DATABASE_URL"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s:\t  %(message)s")
logger = logging.getLogger(__name__)

# ✅ SINGLE APP INSTANCE
app = FastAPI(
    title="MaxCare+ Hospital API",
    description="Complete HMS: Patients, Doctors, Appointments, Lab, Pharmacy, IPD",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ✅ CORS (THIS is what fixes your issue)
origins = [
    "https://maxcare-plus.onrender.com",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Root endpoint
@app.get("/")
def root():
    return {"status": "MaxCare-Plus running"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.1.0", "env": settings.APP_ENV}

# ✅ Register models BEFORE create_all
import app.models  # noqa

Base.metadata.create_all(bind=engine)

# ✅ Run migrations
_MIGRATIONS = [
    # (keep your migration list unchanged)
]

try:
    with engine.connect() as conn:
        for sql in _MIGRATIONS:
            conn.execute(text(sql))
        conn.commit()
    logger.info("DB migrations applied")
except Exception as e:
    logger.warning(f"Migration warning (non-fatal): {e}")

# ✅ Include routes
app.include_router(api_router, prefix="/api/v1")