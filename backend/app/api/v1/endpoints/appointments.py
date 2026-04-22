import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.pharmacy import Prescription
from app.models.lab import LabTest
from app.models.user import User, UserRole
from app.models.shift import Shift, DoctorShift, DayOfWeek
from app.core.deps import get_current_user
from app.core.audit import log_access
from app.core.email import send_appointment_confirmation
from pydantic import BaseModel
from datetime import date, time, datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    slot_time: time
    reason: Optional[str] = None
    notes: Optional[str] = None

class AppointmentReassign(BaseModel):
    doctor_id: Optional[uuid.UUID] = None
    appointment_date: date
    slot_time: time

class PatientSnippet(BaseModel):
    id: uuid.UUID
    patient_code: str
    full_name: str
    class Config: from_attributes = True

class DoctorSnippet(BaseModel):
    id: uuid.UUID
    full_name: str
    specialization: str
    class Config: from_attributes = True

class AppointmentOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: date
    slot_time: time
    status: AppointmentStatus
    reason: Optional[str]
    notes: Optional[str]
    patient: Optional[PatientSnippet] = None
    doctor: Optional[DoctorSnippet] = None
    class Config: from_attributes = True

# ── Helpers ───────────────────────────────────────────────────────────────────

def _enrich(appt: Appointment) -> dict:
    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "doctor_id": appt.doctor_id,
        "appointment_date": appt.appointment_date,
        "slot_time": appt.slot_time,
        "status": appt.status,
        "reason": appt.reason,
        "notes": appt.notes,
        "patient": appt.patient,
        "doctor": appt.doctor,
    }

def is_doctor_on_duty(db: Session, doctor_id: uuid.UUID, appt_date: date, appt_time: time) -> bool:
    """Checks if the doctor is assigned to a shift during the requested time."""
    day_name = appt_date.strftime("%A")
    assignments = db.query(DoctorShift).filter(
        DoctorShift.doctor_id == doctor_id,
        DoctorShift.day_of_week == day_name
    ).all()
    
    if not assignments:
        return False
    
    for ds in assignments:
        shift = ds.shift
        if shift.start_time <= appt_time <= shift.end_time:
            return True
    return False

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Patient).filter(Patient.id == data.patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Pessimistic Locking
    doctor = db.query(Doctor).filter(Doctor.id == data.doctor_id).with_for_update().first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Shift Validation
    if not is_doctor_on_duty(db, data.doctor_id, data.appointment_date, data.slot_time):
         raise HTTPException(
             status_code=400, 
             detail=f"Doctor {doctor.full_name} is not on duty during the requested time ({data.slot_time})"
         )

    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == data.doctor_id,
        Appointment.appointment_date == data.appointment_date,
        Appointment.slot_time == data.slot_time,
        Appointment.status != AppointmentStatus.cancelled,
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked for this doctor")

    appt = Appointment(**data.model_dump())
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Email Confirmation
    if appt.patient and appt.patient.user and appt.patient.user.email:
        try:
            send_appointment_confirmation(
                to_email=appt.patient.user.email,
                patient_name=appt.patient.full_name,
                doctor_name=doctor.full_name,
                appt_date=str(appt.appointment_date),
                appt_time=str(appt.slot_time)[:5],
                ref=f"HMS-{str(appt.id)[:8].upper()}"
            )
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {e}")

    return _enrich(appt)

@router.get("/", response_model=list[AppointmentOut])
def list_appointments(
    request: Request,
    patient_id: Optional[uuid.UUID] = None,
    doctor_id: Optional[uuid.UUID] = None,
    status_filter: Optional[AppointmentStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if patient_id:
        log_access(db, current_user, "LIST_PATIENT_APPOINTMENTS", patient_id=patient_id, request=request)
    else:
        log_access(db, current_user, "LIST_ALL_APPOINTMENTS", request=request)

    q = db.query(Appointment)
    if current_user.role == UserRole.patient:
        if not current_user.patient: return []
        q = q.filter(Appointment.patient_id == current_user.patient.id)
    elif patient_id:
        q = q.filter(Appointment.patient_id == patient_id)

    if doctor_id: q = q.filter(Appointment.doctor_id == doctor_id)
    if status_filter: q = q.filter(Appointment.status == status_filter)

    appts = q.order_by(Appointment.appointment_date.desc(), Appointment.slot_time).all()
    return [_enrich(a) for a in appts]

@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(
    appointment_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == UserRole.patient:
        if not current_user.patient or appt.patient_id != current_user.patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    log_access(db, current_user, "VIEW_APPOINTMENT", patient_id=appt.patient_id, resource_type="Appointment", resource_id=appt.id, request=request)
    return _enrich(appt)

@router.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_status(
    appointment_id: uuid.UUID,
    new_status: AppointmentStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == UserRole.patient:
        if appt.patient_id != current_user.patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        if new_status != AppointmentStatus.cancelled:
            raise HTTPException(status_code=400, detail="Patients can only cancel appointments")

    if current_user.role == UserRole.doctor and current_user.role != UserRole.admin:
        if appt.doctor_id != current_user.doctor.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    appt.status = new_status
    db.commit()
    db.refresh(appt)

    if new_status == AppointmentStatus.confirmed and appt.patient and appt.patient.user and appt.patient.user.email:
        try:
            send_appointment_confirmation(
                to_email=appt.patient.user.email,
                patient_name=appt.patient.full_name,
                doctor_name=appt.doctor.full_name if appt.doctor else "Hospital Doctor",
                appt_date=str(appt.appointment_date),
                appt_time=str(appt.slot_time)[:5],
                ref=f"HMS-{str(appt.id)[:8].upper()}"
            )
        except Exception as e:
            logger.error(f"Failed to send confirmation email on status update: {e}")

    return _enrich(appt)

@router.patch("/{appointment_id}/reassign", response_model=AppointmentOut)
def reassign_appointment(appointment_id: uuid.UUID, data: AppointmentReassign, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    target_doctor_id = data.doctor_id or appt.doctor_id
    
    # Locking & Validation
    doctor = db.query(Doctor).filter(Doctor.id == target_doctor_id).with_for_update().first()
    if not is_doctor_on_duty(db, target_doctor_id, data.appointment_date, data.slot_time):
         raise HTTPException(status_code=400, detail="Doctor is not on duty during this slot")

    conflict = db.query(Appointment).filter(
        Appointment.id != appointment_id,
        Appointment.doctor_id == target_doctor_id,
        Appointment.appointment_date == data.appointment_date,
        Appointment.slot_time == data.slot_time,
        Appointment.status != AppointmentStatus.cancelled
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Slot already booked")

    appt.doctor_id = target_doctor_id
    appt.appointment_date = data.appointment_date
    appt.slot_time = data.slot_time
    db.commit()
    db.refresh(appt)
    return _enrich(appt)

@router.get("/patient/{patient_id}/history")
def patient_history(
    patient_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.patient:
        if not current_user.patient or current_user.patient.id != patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")

    log_access(db, current_user, "VIEW_PATIENT_HISTORY", patient_id=patient.id, request=request)
    
    appts = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.appointment_date.desc()).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    lab_tests = db.query(LabTest).filter(LabTest.patient_id == patient_id).order_by(LabTest.requested_at.desc()).all()

    return {
        "appointments": [_enrich(a) for a in appts],
        "prescriptions": prescriptions,
        "lab_tests": [
            {
                "id": t.id,
                "test_name": t.test_name,
                "status": t.status,
                "result": t.result,
                "completed_at": str(t.completed_at.date()) if t.completed_at else None,
            } for t in lab_tests
        ],
    }
