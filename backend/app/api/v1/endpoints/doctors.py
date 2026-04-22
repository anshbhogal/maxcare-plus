import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.doctor import Doctor
from app.core.security import hash_password
from app.core.encryption import get_blind_index
from app.core.deps import get_current_user
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()


def _generate_employee_id(db: Session) -> str:
    """Auto-generate next unique employee ID: DOC-0001, DOC-0002, ..."""
    # Find the highest existing numeric suffix
    doctors = db.query(Doctor.employee_id).filter(
        Doctor.employee_id.isnot(None),
        Doctor.employee_id.like("DOC-%")
    ).all()
    max_num = 0
    for (emp_id,) in doctors:
        try:
            num = int(emp_id.split("-")[1])
            if num > max_num:
                max_num = num
        except (IndexError, ValueError):
            pass
    return f"DOC-{max_num + 1:04d}"


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialization: str
    license_no: str
    phone: Optional[str] = None
    experience_years: Optional[int] = None
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_days: Optional[str] = None
    available_time: Optional[str] = None

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


class DoctorOut(BaseModel):
    id: uuid.UUID
    employee_id: Optional[str] = None
    full_name: str
    specialization: str
    license_no: str
    phone: Optional[str]
    is_available: bool
    experience_years: Optional[int] = None
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[int] = None
    rating: Optional[float] = None
    patients_treated: Optional[int] = None
    available_days: Optional[str] = None
    available_time: Optional[str] = None
    class Config: from_attributes = True


class DoctorUpdate(BaseModel):
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    is_available: Optional[bool] = None
    experience_years: Optional[int] = None
    qualifications: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[int] = None
    available_days: Optional[str] = None
    available_time: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            digits = ''.join(c for c in v if c.isdigit())
            if len(digits) != 10:
                raise ValueError('Phone must be exactly 10 digits')
            return digits
        return v


@router.post("/", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email_index == get_blind_index(email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Doctor).filter(Doctor.license_no == data.license_no).first():
        raise HTTPException(status_code=400, detail="License number already exists")

    user = User(email=email, password_hash=hash_password(data.password), role=UserRole.doctor)
    db.add(user)
    db.flush()

    emp_id = _generate_employee_id(db)

    doctor = Doctor(
        user_id=user.id,
        employee_id=emp_id,
        full_name=data.full_name,
        specialization=data.specialization,
        license_no=data.license_no,
        phone=data.phone,
        experience_years=data.experience_years,
        qualifications=data.qualifications,
        bio=data.bio,
        consultation_fee=data.consultation_fee,
        available_days=data.available_days,
        available_time=data.available_time,
        rating=4.8,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    logger.info(f"Doctor created: {doctor.full_name} ({emp_id})")
    return doctor


@router.get("/", response_model=list[DoctorOut])
def list_doctors(include_unavailable: bool = False, db: Session = Depends(get_db)):
    q = db.query(Doctor)
    if not include_unavailable:
        q = q.filter(Doctor.is_available == True)
    return q.all()


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.patch("/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: uuid.UUID, data: DoctorUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(doctor, k, v)
    db.commit()
    db.refresh(doctor)
    return doctor
