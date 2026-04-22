from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional, List
from datetime import date, time, datetime
from decimal import Decimal


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── User ──────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "patient"

class UserOut(UserBase):
    id: UUID4
    role: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class PatientOut(BaseModel):
    id: UUID4
    patient_code: str
    full_name: str
    dob: Optional[date]
    gender: Optional[str]
    blood_group: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# ── Doctor ────────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    specialization: str
    license_no: str
    phone: Optional[str] = None

class DoctorOut(BaseModel):
    id: UUID4
    full_name: str
    specialization: str
    license_no: str
    phone: Optional[str]
    is_available: bool
    class Config:
        from_attributes = True


# ── Appointment ───────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    doctor_id: UUID4
    appointment_date: date
    slot_time: time
    reason: Optional[str] = None

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentOut(BaseModel):
    id: UUID4
    patient_id: UUID4
    doctor_id: UUID4
    appointment_date: date
    slot_time: time
    status: str
    reason: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# ── Billing ───────────────────────────────────────────────────────────────────

class BillItemCreate(BaseModel):
    description: str
    amount: Decimal

class BillCreate(BaseModel):
    appointment_id: UUID4
    items: List[BillItemCreate]
    payment_method: Optional[str] = None

class BillItemOut(BaseModel):
    id: UUID4
    description: str
    amount: Decimal
    class Config:
        from_attributes = True

class BillOut(BaseModel):
    id: UUID4
    appointment_id: UUID4
    patient_id: UUID4
    total_amount: Decimal
    payment_status: str
    payment_method: Optional[str]
    billed_at: datetime
    items: List[BillItemOut] = []
    class Config:
        from_attributes = True
