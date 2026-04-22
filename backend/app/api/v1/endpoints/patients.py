import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.core.security import hash_password
from app.core.encryption import get_blind_index
from app.core.deps import get_current_user
from app.core.audit import log_access
from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PatientRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

    @field_validator('email')
    @classmethod
    def lowercase_email(cls, v):
        return v.lower().strip()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            digits = ''.join(c for c in v if c.isdigit())
            if len(digits) != 10:
                raise ValueError('Phone must be exactly 10 digits')
            return digits
        return v


class PatientUpdate(BaseModel):
    """Admin can update any of these fields."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    dob: Optional[date] = None
    address: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            digits = ''.join(c for c in v if c.isdigit())
            if len(digits) != 10:
                raise ValueError('Phone must be exactly 10 digits')
            return digits
        return v

    @field_validator('blood_group')
    @classmethod
    def validate_blood_group(cls, v):
        valid = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
        if v and v not in valid:
            raise ValueError(f'Blood group must be one of {valid}')
        return v


class PatientOut(BaseModel):
    id: uuid.UUID
    patient_code: str
    full_name: str
    email: str
    dob: Optional[date]
    gender: Optional[str]
    blood_group: Optional[str]
    phone: Optional[str]
    address: Optional[str] = None
    class Config: from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_patient_code(db: Session) -> str:
    count = db.query(Patient).count()
    return f"HMS-P-{count + 1:05d}"


def _patient_to_out(p: Patient) -> PatientOut:
    return PatientOut(
        id=p.id,
        patient_code=p.patient_code,
        full_name=p.full_name,
        email=p.user.email if p.user else "",
        dob=p.dob,
        gender=p.gender,
        blood_group=p.blood_group,
        phone=p.phone,
        address=p.address,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def register_patient(data: PatientRegister, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email_index == get_blind_index(email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(data.password), role=UserRole.patient)
    db.add(user)
    db.flush()

    patient = Patient(
        user_id=user.id,
        patient_code=_generate_patient_code(db),
        full_name=data.full_name,
        dob=data.dob,
        gender=data.gender,
        blood_group=data.blood_group,
        phone=data.phone,
        address=data.address,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    logger.info(f"Patient registered: {patient.patient_code} ({email})")
    return _patient_to_out(patient)


@router.get("/", response_model=list[PatientOut])
def list_patients(
    request: Request,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log_access(db, current_user, "LIST_PATIENTS", request=request)
    q = db.query(Patient)
    if search:
        q = q.filter(
            Patient.patient_code.ilike(f"%{search}%") |
            (Patient.phone_index == get_blind_index(search))
        )
    patients = q.order_by(Patient.full_name).offset(skip).limit(limit).all()
    return [_patient_to_out(p) for p in patients]


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: uuid.UUID, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    log_access(db, current_user, "VIEW_PATIENT_DETAILS", patient_id=patient.id, resource_type="Patient", resource_id=patient.id, request=request)
    return _patient_to_out(patient)


@router.patch("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: uuid.UUID,
    data: PatientUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Admin updates patient demographics. Cannot change email/password here."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    updates = data.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(patient, k, v)

    db.commit()
    db.refresh(patient)
    logger.info(f"Patient updated: {patient.patient_code} — fields: {list(updates.keys())}")
    return _patient_to_out(patient)


@router.post("/me/request-deletion", status_code=status.HTTP_202_ACCEPTED)
def request_deletion(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Patient requests their record to be deleted (GDPR Right to be Forgotten)."""
    if current_user.role != UserRole.patient or not current_user.patient:
        raise HTTPException(status_code=400, detail="Only patients can request deletion of their own record")
    
    current_user.patient.deletion_requested_at = datetime.now(timezone.utc)
    db.commit()
    logger.info(f"Deletion requested by patient: {current_user.patient.patient_code}")
    return {"message": "Deletion request received. Records will be purged after the mandatory retention period."}


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def purge_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin purges a patient record (Hard Delete / GDPR Purge)."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can purge records")
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    user = patient.user
    db.delete(patient)
    if user:
        db.delete(user)
    
    db.commit()
    logger.info(f"Patient record PURGED (Right to be Forgotten): {patient_id}")
    return None
