"""
seed_shifts.py — Pre-populate the database with standard hospital shifts.

Usage:
  docker exec -it hms_backend python3 /app/scripts/seed_shifts.py
"""
import sys, os
from datetime import time
sys.path.insert(0, "/app")
os.environ.setdefault("DB_HOST", "db")

from app.db.database import SessionLocal
from app.models.shift import Shift

STANDARD_SHIFTS = [
    {"name": "Morning OPD", "start_time": time(9, 0), "end_time": time(13, 0)},
    {"name": "Afternoon OPD", "start_time": time(14, 0), "end_time": time(18, 0)},
    {"name": "Night Emergency", "start_time": time(20, 0), "end_time": time(8, 0)},
    {"name": "Full Day Duty", "start_time": time(9, 0), "end_time": time(21, 0)},
]

def seed():
    db = SessionLocal()
    try:
        for s_data in STANDARD_SHIFTS:
            existing = db.query(Shift).filter(Shift.name == s_data["name"]).first()
            if not existing:
                shift = Shift(**s_data)
                db.add(shift)
                print(f"[+] Added shift: {s_data['name']}")
            else:
                print(f"[*] Shift already exists: {s_data['name']}")
        
        db.commit()
        print("[+] Seeding completed.")
    except Exception as e:
        print(f"[!] Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
