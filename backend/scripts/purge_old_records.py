"""
purge_old_records.py — Automated GDPR/HIPAA Purge Script.

Purges records based on:
  1. "Right to be Forgotten" (Patients who requested deletion > 30 days ago)
  2. Legal Retention Policy (Records inactive for > 15 years)

Usage (inside hms_backend container):
  python3 /app/scripts/purge_old_records.py
"""
import sys, os
from datetime import datetime, timezone, timedelta
sys.path.insert(0, "/app")

from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.user import User

RETENTION_YEARS = 15
DELETION_COOLOFF_DAYS = 30

def purge_old_records():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Purge requested deletions (after 30-day "cooling off" period)
        cooloff_limit = now - timedelta(days=DELETION_COOLOFF_DAYS)
        requested_to_purge = db.query(Patient).filter(
            Patient.deletion_requested_at.isnot(None),
            Patient.deletion_requested_at < cooloff_limit
        ).all()
        
        # 2. Purge inactive records (older than 15 years)
        retention_limit = now - timedelta(days=RETENTION_YEARS * 365)
        inactive_to_purge = db.query(Patient).filter(
            Patient.last_activity_at < retention_limit
        ).all()
        
        # Combine unique records
        to_purge = {p.id: p for p in (requested_to_purge + inactive_to_purge)}.values()
        
        count = 0
        for p in to_purge:
            p_id = p.id
            user = p.user
            db.delete(p)
            if user:
                db.delete(user)
            count += 1
            print(f"  - Purging: {p_id}")
            
        db.commit()
        if count > 0:
            print(f"✓ Purged {count} patient records (Right to be Forgotten / Retention Policy)")
        else:
            print("No records found for purging.")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    purge_old_records()
