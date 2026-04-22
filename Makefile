.PHONY: up down logs build restart shell-backend shell-db reset-admin create-user migrate status

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

logs:
	docker compose logs -f backend

restart:
	docker compose restart backend

shell-backend:
	docker exec -it hms_backend bash

shell-db:
	docker exec -it hms_db psql -U hms_user -d hms_db

status:
	docker compose ps

# ── Auth helpers ──────────────────────────────────────────────────────────────
reset-admin:
	docker exec -it hms_backend python3 /app/scripts/reset_admin.py

create-user:
	docker exec -it hms_backend python3 /app/scripts/create_user.py $(EMAIL) $(PASS) $(ROLE)

# ── Database migration (run if columns missing) ────────────────────────────────
# NOTE: This is now auto-run on every backend startup.
# Run manually only if you need to force it:
migrate:
	docker exec -it hms_backend python3 /app/scripts/migrate_doctor_columns.py

# ── View recent appointments (debug) ─────────────────────────────────────────
show-appts:
	docker exec -it hms_db psql -U hms_user -d hms_db -c "SELECT p.full_name, p.phone, a.appointment_date, a.slot_time, a.status, a.reason FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id ORDER BY a.created_at DESC LIMIT 20;"

# ── View all patients ─────────────────────────────────────────────────────────
show-patients:
	docker exec -it hms_db psql -U hms_user -d hms_db -c "SELECT patient_code, full_name, phone, gender, blood_group FROM patients ORDER BY patient_code;"

migrate-all:
	docker exec -it hms_backend python3 /app/scripts/migrate_doctor_columns.py

show-doctors:
	docker exec -it hms_db psql -U hms_user -d hms_db -c "SELECT employee_id, full_name, specialization, phone FROM doctors ORDER BY employee_id;"

# ── Disaster Recovery (Data Sovereignty) ─────────────────────────────────────
db-backup:
	docker exec -it hms_backend python3 /app/scripts/backup_db.py

db-restore:
	docker exec -it hms_backend python3 /app/scripts/restore_db.py $(FILE)
