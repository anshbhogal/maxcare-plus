from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment, AppointmentStatus
from app.models.bill import Bill, PaymentStatus
from app.models.ipd import Bed, BedStatus, Admission
from app.core.deps import require_admin

router = APIRouter()

from pydantic import BaseModel
from typing import List, Optional
from datetime import time
import uuid
from app.models.shift import Shift, DoctorShift, DayOfWeek

class ShiftCreate(BaseModel):
    name: str
    start_time: time
    end_time: time

class ShiftOut(BaseModel):
    id: uuid.UUID
    name: str
    start_time: time
    end_time: time
    class Config: from_attributes = True

class DoctorShiftAssign(BaseModel):
    shift_id: uuid.UUID
    day_of_week: DayOfWeek

class DoctorShiftOut(BaseModel):
    id: uuid.UUID
    doctor_id: uuid.UUID
    shift_id: uuid.UUID
    day_of_week: DayOfWeek
    shift: ShiftOut
    class Config: from_attributes = True

@router.get("/shifts", response_model=List[ShiftOut])
def list_shifts(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(Shift).all()

@router.post("/shifts", response_model=ShiftOut)
def create_shift(data: ShiftCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    shift = Shift(**data.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift

@router.get("/doctors/{doctor_id}/shifts", response_model=List[DoctorShiftOut])
def list_doctor_shifts(doctor_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(DoctorShift).filter(DoctorShift.doctor_id == doctor_id).all()

@router.post("/doctors/{doctor_id}/shifts", response_model=DoctorShiftOut)
def assign_doctor_shift(doctor_id: uuid.UUID, data: DoctorShiftAssign, db: Session = Depends(get_db), _=Depends(require_admin)):
    # Check if assignment already exists
    existing = db.query(DoctorShift).filter(
        DoctorShift.doctor_id == doctor_id,
        DoctorShift.day_of_week == data.day_of_week,
        DoctorShift.shift_id == data.shift_id
    ).first()
    if existing:
        return existing
    
    ds = DoctorShift(doctor_id=doctor_id, **data.model_dump())
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds

@router.delete("/doctors/shifts/{assignment_id}")
def remove_doctor_shift(assignment_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    ds = db.query(DoctorShift).filter(DoctorShift.id == assignment_id).first()
    if ds:
        db.delete(ds)
        db.commit()
    return {"message": "Assignment removed"}

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    total_appointments = db.query(Appointment).count()
    today_appointments = db.query(Appointment).filter(
        func.date(Appointment.appointment_date) == func.current_date()
    ).count()
    pending_appointments = db.query(Appointment).filter(
        Appointment.status == AppointmentStatus.pending
    ).count()
    total_revenue = db.query(func.sum(Bill.total_amount)).filter(
        Bill.payment_status == PaymentStatus.paid
    ).scalar() or 0
    pending_revenue = db.query(func.sum(Bill.total_amount)).filter(
        Bill.payment_status == PaymentStatus.pending
    ).scalar() or 0
    available_beds = db.query(Bed).filter(Bed.status == BedStatus.available).count()
    occupied_beds = db.query(Bed).filter(Bed.status == BedStatus.occupied).count()
    active_admissions = db.query(Admission).filter(Admission.status == "admitted").count()
    return {
        "patients": total_patients,
        "doctors": total_doctors,
        "appointments": {"total": total_appointments, "today": today_appointments, "pending": pending_appointments},
        "revenue": {"collected": float(total_revenue), "pending": float(pending_revenue)},
        "beds": {"available": available_beds, "occupied": occupied_beds},
        "active_admissions": active_admissions,
    }
