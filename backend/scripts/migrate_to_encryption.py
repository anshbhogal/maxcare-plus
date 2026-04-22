"""
migrate_to_encryption.py — One-time migration to encrypt existing PII data.

Usage:
  docker exec -it hms_backend python3 /app/scripts/migrate_to_encryption.py
"""
import sys, os
sys.path.insert(0, "/app")
os.environ.setdefault("DB_HOST", "db")

from sqlalchemy import text
from app.db.database import SessionLocal
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.core.encryption import encrypt_pii, get_blind_index, decrypt_pii

def is_already_encrypted(data: str) -> bool:
    if not data: return True
    # If we can decrypt it and get something different, it was encrypted.
    # If decryption returns the same string (fallback), it's probably plaintext.
    decrypted = decrypt_pii(data)
    return decrypted != data

def migrate():
    db = SessionLocal()
    try:
        print("[*] Migrating Users (Email)...")
        users = db.query(User).all()
        for u in users:
            # We must populate email_index even if already encrypted
            if u.email:
                u.email_index = get_blind_index(u.email)
                # If email looks like plaintext, encrypt it
                if not is_already_encrypted(u.email):
                    u.email = u.email # Trigger @validates and EncryptedString
        
        print("[*] Migrating Patients (Name, Phone, DOB, Address)...")
        patients = db.query(Patient).all()
        for p in patients:
            if p.phone:
                p.phone_index = get_blind_index(p.phone)
            # Re-assigning triggers the EncryptedString process_bind_param
            p.full_name = p.full_name
            p.phone = p.phone
            p.address = p.address
            p.dob = p.dob
            
        print("[*] Migrating Doctors (Name, Phone)...")
        doctors = db.query(Doctor).all()
        for d in doctors:
            d.full_name = d.full_name
            d.phone = d.phone

        db.commit()
        print("[+] Migration completed successfully.")
        
    except Exception as e:
        print(f"[!] Migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
