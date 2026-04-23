"""
create_user.py — Create or reset a user password from the command line.

Usage (inside hms_backend container):
  python3 /app/scripts/create_user.py <email> <password> <role>

Examples:
  python3 /app/scripts/create_user.py admin@hms.local Admin@123 admin
  python3 /app/scripts/create_user.py doctor@hms.local Doc@123 doctor
  python3 /app/scripts/create_user.py patient@hms.local Pat@123 patient

If the user already exists, their password_hash is updated.
"""
import sys, os
sys.path.insert(0, "/app")

if len(sys.argv) < 4:
    print(__doc__)
    sys.exit(1)

email, password, role = sys.argv[1], sys.argv[2], sys.argv[3]

if role not in ("admin", "doctor", "patient"):
    print(f"ERROR: role must be admin, doctor, or patient (got: {role})")
    sys.exit(1)

from app.core.security import hash_password
from app.core.encryption import get_blind_index
from app.db.database import SessionLocal
from app.models.user import User, UserRole

db = SessionLocal()
try:
    user = db.query(User).filter(User.email_index == get_blind_index(email)).first()
    new_hash = hash_password(password)

    if user:
        user.password_hash = new_hash
        action = "Updated"
    else:
        user = User(email=email, password_hash=new_hash, role=UserRole(role))
        db.add(user)
        action = "Created"

    db.commit()
    print(f"✓ {action} user: {email} (role={role})")
except Exception as e:
    print(f"ERROR: {e}")
    db.rollback()
    sys.exit(1)
finally:
    db.close()
