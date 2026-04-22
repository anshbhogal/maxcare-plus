"""
run_once: Reset admin password hash to be compatible with the new
SHA-256 + bcrypt security pipeline.

Run this ONCE after deploying the updated backend:
  docker exec -it hms_backend python3 /app/scripts/reset_admin.py

It will rehash the admin password using the correct pipeline and
update the database row. After this, Admin@123 will work correctly.
"""
import sys
import os

sys.path.insert(0, "/app")
os.environ.setdefault("DB_HOST", "db")

from app.core.security import hash_password
from app.core.encryption import get_blind_index
from app.db.database import SessionLocal
from app.models.user import User

ADMIN_EMAIL = "admin@hms.local"
ADMIN_PASSWORD = "Admin@123"

db = SessionLocal()
try:
    user = db.query(User).filter(User.email_index == get_blind_index(ADMIN_EMAIL)).first()
    if not user:
        print(f"ERROR: No user found with email {ADMIN_EMAIL}")
        sys.exit(1)

    new_hash = hash_password(ADMIN_PASSWORD)
    user.password_hash = new_hash
    db.commit()
    print(f"✓ Password hash updated for {ADMIN_EMAIL}")
    print(f"  New hash: {new_hash[:30]}...")
    print(f"  Login with: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()
    sys.exit(1)
finally:
    db.close()
