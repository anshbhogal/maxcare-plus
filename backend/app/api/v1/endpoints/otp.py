"""
OTP-based mobile account linking.

Flow:
  1. POST /otp/check-phone       → check if phone has an existing patient record
  2. POST /otp/send              → generate + "send" OTP (logs it; real SMS in Phase 2)
  3. POST /otp/verify-and-link   → verify OTP + link existing patient to new user account

Architecture is SMS-gateway-ready: replace _send_otp() with Twilio/MSG91 when ready.
"""
import random
import string
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.otp import OTPRecord
from app.core.security import hash_password
from app.core.encryption import get_blind_index
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

OTP_EXPIRY_MINUTES = 10
MAX_ATTEMPTS = 3


# ── Schemas ───────────────────────────────────────────────────────────────────

class PhoneCheckRequest(BaseModel):
    phone: str

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        digits = ''.join(c for c in v if c.isdigit())
        if len(digits) != 10:
            raise ValueError('Phone must be 10 digits')
        return digits


class OTPSendRequest(BaseModel):
    phone: str
    purpose: str = "account_link"

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        digits = ''.join(c for c in v if c.isdigit())
        if len(digits) != 10:
            raise ValueError('Phone must be 10 digits')
        return digits


class OTPVerifyAndLinkRequest(BaseModel):
    phone: str
    code: str
    # New account details
    email: EmailStr
    password: str
    full_name: Optional[str] = None  # overrides existing if provided

    @field_validator('email')
    @classmethod
    def lowercase_email(cls, v):
        return v.lower().strip()

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        digits = ''.join(c for c in v if c.isdigit())
        if len(digits) != 10:
            raise ValueError('Phone must be 10 digits')
        return digits


# ── Internal helpers ──────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """6-digit numeric OTP."""
    return ''.join(random.choices(string.digits, k=6))


def _send_otp(phone: str, code: str, purpose: str) -> None:
    """
    Phase 1: Log OTP (development mode).
    Phase 2: Replace with SMS gateway (Twilio/MSG91).
    """
    logger.warning(
        f"[OTP] Phone: +91{phone} | Code: {code} | Purpose: {purpose} | "
        f"Expires in {OTP_EXPIRY_MINUTES}min | "
        f"[SMS gateway not yet configured — showing in logs]"
    )


def _invalidate_old_otps(phone: str, purpose: str, db: Session) -> None:
    """Mark all prior unused OTPs for this phone+purpose as used."""
    db.query(OTPRecord).filter(
        OTPRecord.phone_index == get_blind_index(phone),
        OTPRecord.purpose == purpose,
        OTPRecord.is_used == False,
    ).update({"is_used": True})


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/check-phone")
def check_phone(req: PhoneCheckRequest, db: Session = Depends(get_db)):
    """
    Check if a phone number has an existing patient record.
    Returns:
      - exists: bool
      - patient_name: str (if exists, for display)
      - can_link: bool (True if patient record has no registered user)
    """
    patient = db.query(Patient).filter(Patient.phone_index == get_blind_index(req.phone)).first()
    if not patient:
        return {"exists": False, "patient_name": None, "can_link": False}

    # Check if user account already fully registered (non-walkin email)
    has_real_account = (
        patient.user and
        not patient.user.email.endswith("@maxcare.local")
    )

    return {
        "exists": True,
        "patient_name": patient.full_name,
        "patient_code": patient.patient_code,
        "can_link": not has_real_account,
        "has_real_account": has_real_account,
    }


@router.post("/send")
def send_otp(req: OTPSendRequest, db: Session = Depends(get_db)):
    """
    Generate and send an OTP to the given phone number.
    Rate-limited to prevent abuse (1 OTP per 60 seconds).
    """
    # Rate limit: check if OTP was sent in last 60 seconds
    recent_cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
    recent = db.query(OTPRecord).filter(
        OTPRecord.phone_index == get_blind_index(req.phone),
        OTPRecord.purpose == req.purpose,
        OTPRecord.is_used == False,
        OTPRecord.created_at > recent_cutoff,
    ).first()

    if recent:
        raise HTTPException(
            status_code=429,
            detail="Please wait 60 seconds before requesting another OTP."
        )

    # Check patient exists for account_link
    if req.purpose == "account_link":
        patient = db.query(Patient).filter(Patient.phone_index == get_blind_index(req.phone)).first()
        if not patient:
            raise HTTPException(
                status_code=404,
                detail="No patient record found with this mobile number."
            )

    # Invalidate old OTPs
    _invalidate_old_otps(req.phone, req.purpose, db)

    # Generate new OTP
    code = _generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    otp_record = OTPRecord(
        phone=req.phone,
        code=code,
        purpose=req.purpose,
        expires_at=expires,
    )
    db.add(otp_record)
    db.commit()

    _send_otp(req.phone, code, req.purpose)

    return {
        "success": True,
        "message": f"OTP sent to +91{req.phone}. Valid for {OTP_EXPIRY_MINUTES} minutes.",
        # In development: return OTP so it can be tested without SMS
        # REMOVE this line before production deployment
        "dev_otp": code,
    }


@router.post("/verify-and-link")
def verify_and_link(req: OTPVerifyAndLinkRequest, db: Session = Depends(get_db)):
    """
    Verify OTP and link existing patient record to a new user account.

    Steps:
    1. Validate OTP
    2. Find existing patient by phone
    3. Check email not already taken
    4. Create new User with provided credentials
    5. Update patient.user_id to new user
    6. Mark walkin user as inactive (soft delete)
    """
    now = datetime.now(timezone.utc)

    # 1. Find valid OTP
    otp = db.query(OTPRecord).filter(
        OTPRecord.phone_index == get_blind_index(req.phone),
        OTPRecord.purpose == "account_link",
        OTPRecord.is_used == False,
        OTPRecord.expires_at > now,
    ).order_by(OTPRecord.created_at.desc()).first()

    if not otp:
        raise HTTPException(
            status_code=400,
            detail="OTP has expired or is invalid. Please request a new one."
        )

    # Track attempts
    otp.attempts += 1
    if otp.attempts > MAX_ATTEMPTS:
        otp.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Too many incorrect attempts. Please request a new OTP."
        )

    if otp.code != req.code:
        db.commit()  # save attempt count
        attempts_left = MAX_ATTEMPTS - otp.attempts
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect OTP. {attempts_left} attempt(s) remaining."
        )

    # OTP is correct — mark as used
    otp.is_used = True

    # 2. Find patient by phone
    patient = db.query(Patient).filter(Patient.phone_index == get_blind_index(req.phone)).first()
    if not patient:
        db.commit()
        raise HTTPException(status_code=404, detail="Patient record not found.")

    # 3. Check email not already taken by another user
    existing_email_user = db.query(User).filter(
        User.email_index == get_blind_index(req.email),
        User.id != (patient.user_id if patient.user_id else None),
    ).first()
    if existing_email_user:
        db.commit()
        raise HTTPException(status_code=400, detail="Email already registered to another account.")

    # 4. Create new User
    new_user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.patient,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # 5. Deactivate old walkin user if it was auto-generated
    if patient.user and patient.user.email.endswith("@maxcare.local"):
        patient.user.is_active = False
        patient.user.email = f"deactivated.{patient.user.email}"

    # 6. Link patient to new user
    patient.user_id = new_user.id
    if req.full_name:
        patient.full_name = req.full_name
    if req.gender:
        patient.gender = req.gender
    if req.blood_group:
        patient.blood_group = req.blood_group
    if req.dob:
        patient.dob = req.dob
    if req.address:
        patient.address = req.address

    db.commit()
    db.refresh(patient)

    logger.info(
        f"Account linked: patient {patient.patient_code} → "
        f"new user {req.email} (phone: {req.phone})"
    )

    return {
        "success": True,
        "message": "Account created and linked successfully. You can now log in.",
        "patient_code": patient.patient_code,
        "email": req.email,
    }
