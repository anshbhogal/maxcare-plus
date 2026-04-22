from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import Base, engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:\t  %(message)s")
logger = logging.getLogger(__name__)

import app.models  # noqa: F401 — registers all models before create_all

Base.metadata.create_all(bind=engine)

# ── Idempotent column migrations (safe every startup) ────────────────────────
_MIGRATIONS = [
    # Doctor extended profile columns
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications VARCHAR(300)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(200)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS patients_treated INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_days VARCHAR(100)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_time VARCHAR(100)",
    # Doctor employee_id
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_employee_id ON doctors(employee_id) WHERE employee_id IS NOT NULL",
    # Patient address
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT",
    # HIPAA/GDPR Compliance Migrations
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_index VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_index VARCHAR(255)",
    "ALTER TABLE patients ALTER COLUMN dob TYPE TEXT",
    "ALTER TABLE patients ALTER COLUMN phone TYPE TEXT",
    "ALTER TABLE patients ALTER COLUMN gender TYPE TEXT",
    "ALTER TABLE patients ALTER COLUMN blood_group TYPE TEXT",
    "ALTER TABLE patients ALTER COLUMN full_name TYPE TEXT",
    "ALTER TABLE doctors ALTER COLUMN phone TYPE TEXT",
    "ALTER TABLE doctors ALTER COLUMN full_name TYPE TEXT",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE otp_records ADD COLUMN IF NOT EXISTS email TEXT",
    "ALTER TABLE otp_records ADD COLUMN IF NOT EXISTS email_index VARCHAR(255)",
    "ALTER TABLE otp_records ADD COLUMN IF NOT EXISTS phone_index VARCHAR(255)",
    "ALTER TABLE otp_records ALTER COLUMN phone DROP NOT NULL",
    # Immutability
    "ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1",
    # Unique Indices for PII blind indices
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_index ON users(email_index) WHERE email_index IS NOT NULL",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_phone_index ON patients(phone_index) WHERE phone_index IS NOT NULL",
]

try:
    with engine.connect() as conn:
        for sql in _MIGRATIONS:
            conn.execute(text(sql))
        conn.commit()
    logger.info("DB migrations applied")
except Exception as e:
    logger.warning(f"Migration warning (non-fatal): {e}")

app = FastAPI(
    title="MaxCare+ Hospital API",
    description="Complete HMS: Patients, Doctors, Appointments, Lab, Pharmacy, IPD",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.1.0", "env": settings.APP_ENV}
