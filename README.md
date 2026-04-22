# MaxCare+ Hospital Management System

**A full-stack multi-speciality hospital platform**  
FastAPI · PostgreSQL · React · Docker

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TanStack Query + Zustand + Recharts |
| Backend | FastAPI (Python 3.11) + SQLAlchemy |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose) + bcrypt (SHA-256 pre-hash) |
| Dev environment | Docker + Docker Compose |

---

## Quick Start

### Prerequisites
- Docker Desktop (running)
- Node.js 18+

### 1. Configure environment
```bash
cp .env.example .env
# Edit .env if needed — defaults work for local dev
```

### 2. Start backend + database
```bash
make build
# Waits for DB, then starts FastAPI
# http://localhost:8000/health
# http://localhost:8000/docs  ← Interactive API docs
```

### 3. Set admin password (run ONCE after first build)
```bash
make reset-admin
# Sets correct bcrypt hash for admin@hms.local / Admin@123
```

### 4. Start frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173  ← Landing page
```

---

## URLs

| URL | Description |
|---|---|
| http://localhost:5173/ | MaxCare+ Landing Page |
| http://localhost:5173/doctors | Doctor Directory |
| http://localhost:5173/login | Login (all roles) |
| http://localhost:5173/register | Patient Registration |
| http://localhost:5173/admin | Admin Dashboard |
| http://localhost:5173/doctor | Doctor Dashboard |
| http://localhost:5173/patient | Patient Dashboard |
| http://localhost:8000/docs | FastAPI Swagger Docs |

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@hms.local | Admin@123 |

---

## Makefile Commands

```bash
make build          # Build images and start all containers
make up             # Start containers (no rebuild)
make down           # Stop containers
make logs           # Follow container logs
make restart        # Restart backend only
make shell-backend  # Shell into backend container
make shell-db       # PostgreSQL psql shell
make reset-admin    # Reset admin password hash
make create-user EMAIL=x@y.com PASS=P@ss123 ROLE=doctor
```

---

## API Modules

| Module | Prefix | Auth |
|---|---|---|
| Public (landing page) | /api/v1/public | None |
| Auth | /api/v1/auth | None |
| Patients | /api/v1/patients | JWT |
| Doctors | /api/v1/doctors | JWT |
| Appointments | /api/v1/appointments | JWT |
| Laboratory | /api/v1/lab | JWT |
| Pharmacy | /api/v1/pharmacy | JWT |
| IPD | /api/v1/ipd | JWT |
| Admin Stats | /api/v1/admin | JWT + Admin role |

---

## Project Structure

```
maxcare-hms/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # All route handlers
│   │   ├── core/                # Config, security, deps
│   │   ├── db/                  # Database session
│   │   └── models/              # SQLAlchemy models
│   ├── scripts/                 # Admin utilities
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── public/          # Landing, Doctors directory
│       │   ├── admin/           # Admin portal pages
│       │   ├── doctor/          # Doctor portal pages
│       │   └── patient/         # Patient portal pages
│       ├── components/          # Shared UI components
│       ├── api/                 # Axios client
│       └── store/               # Zustand auth store
├── database/
│   └── migrations/              # SQL schema + seed data
├── docker-compose.yml
├── Makefile
└── .env.example
```

---

## Upcoming Features (Phase 2)
- OTP authentication (Twilio / AWS SNS)
- SMS appointment alerts
- Payment gateway integration (Razorpay)
- Insurance claim management
- AI disease prediction module
- Mobile app (React Native)
