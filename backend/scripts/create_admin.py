"""
create_admin.py — Idempotent Admin User Creation Script.

Creates the default admin user if it doesn't exist, or resets its password/role.
This script correctly handles:
  1. PII Encryption (email is encrypted in DB)
  2. Blind Indexing (email_index is used for searching)
  3. Password Hashing (compatible with the app's security pipeline)
  4. Role assignment (admin)

Usage:
  python3 backend/scripts/create_admin.py
"""
import sys
import os

# Ensure we can import from the app directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password
from app.core.encryption import get_blind_index

ADMIN_EMAIL = "admin@maxcare.com"
ADMIN_PASSWORD = "Admin@123"

def setup_admin():
    db = SessionLocal()
    try:
        # Search by blind index (PII-compliant)
        email_index = get_blind_index(ADMIN_EMAIL)
        user = db.query(User).filter(User.email_index == email_index).first()

        if user:
            print(f"[*] Admin user already exists ({ADMIN_EMAIL}). Updating password and role...")
            user.password_hash = hash_password(ADMIN_PASSWORD)
            user.role = UserRole.admin
            user.is_active = True
        else:
            print(f"[*] Creating new admin user: {ADMIN_EMAIL}...")
            user = User(
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True
            )
            db.add(user)
        
        db.commit()
        print("✅ Admin setup successfully!")
        print(f"   Email:    {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Role:     {UserRole.admin}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during admin creation: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    setup_admin()
