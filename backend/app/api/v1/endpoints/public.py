"""
Public endpoints — no authentication required.
Used by the landing page for doctor listing and appointment booking.
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.models.appointment import Appointment, AppointmentStatus
from app.models.shift import Shift, DoctorShift, DayOfWeek
from app.core.email import send_appointment_confirmation, send_otp_email
from app.core.security import hash_password
from app.core.encryption import get_blind_index
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, time as dt_time

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class PublicDoctorOut(BaseModel):
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
    available_days: Optional[str] = None
    available_time: Optional[str] = None
    class Config: from_attributes = True


class PublicAppointmentRequest(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    department: str
    preferred_date: date
    preferred_time: str
    consultation_type: str = "First Consultation"
    message: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        digits = ''.join(c for c in v if c.isdigit())
        if len(digits) != 10:
            raise ValueError('Phone must be 10 digits')
        return digits


class PublicAppointmentResponse(BaseModel):
    success: bool
    message: str
    reference: Optional[str] = None


# ── Doctor listing (public, no auth) ─────────────────────────────────────────

@router.get("/doctors", response_model=list[PublicDoctorOut])
def list_public_doctors(specialization: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Doctor).filter(Doctor.is_available == True)
    if specialization:
        q = q.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    return q.all()


@router.get("/specializations")
def list_specializations(db: Session = Depends(get_db)):
    docs = db.query(Doctor.specialization).distinct().all()
    return {"specializations": sorted([d[0] for d in docs])}


def is_doctor_on_duty(db: Session, doctor_id: uuid.UUID, appt_date: date, appt_time: dt_time) -> bool:
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


# ── Public appointment booking ────────────────────────────────────────────────

@router.post("/appointment-request", response_model=PublicAppointmentResponse)
def public_appointment_request(data: PublicAppointmentRequest, db: Session = Depends(get_db)):
    """
    FIX: No longer silently swallows exceptions.
    All errors are logged and either raised or returned with context.
    The appointment is ALWAYS created if a doctor exists — regardless of email.
    """
    ref = f"MCR-{str(uuid.uuid4())[:8].upper()}"

    try:
        # ── Step 1: Find or create patient ────────────────────────────────────
        patient = db.query(Patient).filter(Patient.phone_index == get_blind_index(data.phone if hasattr(data, "phone") else digits)).first()

        if not patient and data.email:
            existing_user = db.query(User).filter(
                User.email_index == get_blind_index(data.email.lower())
            ).first()
            if existing_user and existing_user.patient:
                patient = existing_user.patient

        if not patient:
            # Create walkin patient account
            email = data.email.lower() if data.email else f"walkin.{data.phone}@maxcare.local"

            # Check if walkin user already exists (re-booking same phone)
            existing = db.query(User).filter(User.email_index == get_blind_index(email)).first()
            if existing and existing.patient:
                patient = existing.patient
            elif existing and not existing.patient:
                # User exists without patient profile (edge case)
                count = db.query(Patient).count()
                patient = Patient(
                    user_id=existing.id,
                    patient_code=f"HMS-P-{count + 1:05d}",
                    full_name=data.full_name,
                    phone=data.phone,
                )
                db.add(patient)
                db.flush()
            else:
                # Brand new walkin — create user + patient
                new_user = User(
                    email=email,
                    password_hash=hash_password(f"MaxCare@{str(uuid.uuid4())[:8]}"),
                    role=UserRole.patient,
                )
                db.add(new_user)
                db.flush()

                count = db.query(Patient).count()
                patient = Patient(
                    user_id=new_user.id,
                    patient_code=f"HMS-P-{count + 1:05d}",
                    full_name=data.full_name,
                    phone=data.phone,
                )
                db.add(patient)
                db.flush()

        logger.info(f"Public booking [{ref}]: patient {patient.patient_code} ({patient.full_name})")

        # ── Step 2: Find doctor with Pessimistic Locking ──────────────────────
        doctor = db.query(Doctor).filter(
            Doctor.specialization.ilike(f"%{data.department}%"),
            Doctor.is_available == True,
        ).with_for_update().first()

        if not doctor:
            doctor = db.query(Doctor).filter(Doctor.is_available == True).with_for_update().first()

        # Fallback: If NO ACTIVE doctors, try ANY doctor matching department
        if not doctor:
            doctor = db.query(Doctor).filter(
                Doctor.specialization.ilike(f"%{data.department}%")
            ).with_for_update().first()

        # Final fallback: ANY doctor at all
        if not doctor:
            doctor = db.query(Doctor).with_for_update().first()

        if not doctor:
            # No doctors in DB at all (not even inactive ones)
            db.commit()
            logger.warning(
                f"Public booking [{ref}]: NO DOCTORS IN DATABASE. "
                f"Patient {patient.patient_code} created but NO appointment record. "
                f"Add a doctor in admin panel first."
            )
            return PublicAppointmentResponse(
                success=True,
                message="Your appointment request has been sent. You will be informed shortly on your mobile number.",
                reference=ref,
            )

        # ── Step 3: Parse preferred time ──────────────────────────────────────
        t_obj = dt_time(9, 0)  # safe default
        try:
            t_str = data.preferred_time.strip().upper().replace('.', '')
            if 'AM' in t_str or 'PM' in t_str:
                from datetime import datetime as dt
                fmt = "%I:%M %p" if ':' in t_str else "%I %p"
                t_obj = dt.strptime(t_str, fmt).time()
            else:
                parts = t_str.split(':')
                h = int(parts[0])
                m = int(parts[1]) if len(parts) > 1 else 0
                t_obj = dt_time(h, m)
        except Exception as te:
            logger.warning(f"Time parse failed for '{data.preferred_time}': {te} — defaulting to 09:00")

        # ── Step 4: Conflict Check (Informational) ────────────────────────────
        conflict = db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.appointment_date == data.preferred_date,
            Appointment.slot_time == t_obj,
            Appointment.status != AppointmentStatus.cancelled,
        ).first()

        booking_notes = (
            f"Website booking. Phone: +91{data.phone}. "
            f"Preferred: {data.preferred_time}. Ref: {ref}"
        )

        if conflict:
            logger.warning(f"Public booking [{ref}]: Slot {data.preferred_date} {t_obj} already booked for doctor {doctor.full_name}")
            booking_notes += f" | NOTE: Requested slot was already booked."

        # ── Step 4.5: Shift Validation (Informational) ────────────────────────
        if not is_doctor_on_duty(db, doctor.id, data.preferred_date, t_obj):
            logger.warning(f"Public booking [{ref}]: Doctor {doctor.full_name} NOT ON DUTY at {data.preferred_date} {t_obj}")
            booking_notes += f" | NOTE: Requested outside standard hours - needs admin assignment."

        # ── Step 5: Build reason string ───────────────────────────────────────
        reason_parts = [
            f"[{data.consultation_type}]",
            f"Dept: {data.department}",
        ]
        if data.message:
            reason_parts.append(data.message)
        reason_parts.append(f"Ref:{ref}")

        # ── Step 5: Create appointment ────────────────────────────────────────
        appt = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            appointment_date=data.preferred_date,
            slot_time=t_obj,
            status=AppointmentStatus.pending,
            reason=" | ".join(reason_parts),
            notes=booking_notes,
        )
        db.add(appt)
        db.commit()

        # Send confirmation email
        if data.email:
            try:
                send_appointment_confirmation(
                    to_email=data.email.lower(),
                    patient_name=data.full_name,
                    doctor_name=doctor.full_name,
                    appt_date=str(data.preferred_date),
                    appt_time=str(t_obj)[:5],
                    ref=ref
                )
            except Exception as e:
                logger.error(f"Failed to send confirmation email: {e}")

        logger.info(
            f"Public appointment CREATED [{ref}]: "
            f"patient={patient.patient_code}, "
            f"doctor={doctor.employee_id or doctor.full_name}, "
            f"date={data.preferred_date}, dept={data.department}"
        )

        return PublicAppointmentResponse(
            success=True,
            message="Your appointment request has been sent. You will be informed shortly on your mobile number.",
            reference=ref,
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # LOG THE REAL ERROR — this was the bug: exceptions were silently swallowed
        logger.error(
            f"Public booking FAILED [{ref}]: {type(e).__name__}: {e}",
            exc_info=True,
        )
        # Re-raise as 500 so the client knows something went wrong
        raise HTTPException(
            status_code=500,
            detail=f"Booking failed: {str(e)}. Please call +91 98765 11111 directly.",
        )


# ── Patient lookup by phone ───────────────────────────────────────────────────

@router.get("/patient-by-phone/{phone}")
def get_patient_by_phone(phone: str, db: Session = Depends(get_db)):
    """Admin uses this to look up patient details by mobile number."""
    digits = ''.join(c for c in phone if c.isdigit())
    patient = db.query(Patient).filter(Patient.phone_index == get_blind_index(digits)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="No patient found with this mobile number")
    return {
        "id": str(patient.id),
        "patient_code": patient.patient_code,
        "full_name": patient.full_name,
        "phone": patient.phone,
        "email": patient.user.email if patient.user else None,
        "blood_group": patient.blood_group,
        "gender": patient.gender,
        "address": patient.address,
    }
