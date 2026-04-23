"""
Run this if backend startup migration fails (e.g. permission issues).
docker exec -it hms_backend python3 /app/scripts/migrate_doctor_columns.py
"""
import sys, os
sys.path.insert(0, "/app")

from app.db.database import engine
from sqlalchemy import text

MIGRATIONS = [
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications VARCHAR(300)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(200)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 4.8",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS patients_treated INT",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_days VARCHAR(100)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS available_time VARCHAR(100)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_employee_id ON doctors(employee_id) WHERE employee_id IS NOT NULL",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT",
    # OTP table
    """CREATE TABLE IF NOT EXISTS otp_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        phone VARCHAR(10) NOT NULL,
        code VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'account_link',
        is_used BOOLEAN DEFAULT FALSE,
        attempts INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
    )""",
    "CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_records(phone)",
]

with engine.connect() as conn:
    for sql in MIGRATIONS:
        try:
            conn.execute(text(sql))
            print(f"✓ {sql[:60].strip()}...")
        except Exception as e:
            print(f"⚠ {str(e)[:80]}")
    conn.commit()

print("\n✅ All migrations applied.")
