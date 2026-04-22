import logging
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.core.security import verify_password, create_access_token, decode_token, hash_password
from app.core.encryption import get_blind_index
from app.core.deps import oauth2_scheme
from app.core.email import send_otp_email
from app.models.user import User, UserRole
from app.models.security import BlacklistedToken
from app.models.otp import OTPRecord
from app.models.doctor import Doctor

logger = logging.getLogger(__name__)
router = APIRouter()


def _find_user_by_login(identifier: str, db: Session):
    """
    Find user by email OR by doctor employee_id.
    identifier is lowercased before matching.
    """
    identifier = identifier.lower().strip()

    # 1. Try direct email match via blind index
    user = db.query(User).filter(User.email_index == get_blind_index(identifier)).first()
    if user:
        return user

    # 2. Try employee_id match (doctors only)
    #    employee_id is stored as DOC-0001 (uppercase), try both cases
    emp_id_upper = identifier.upper()
    doctor = db.query(Doctor).filter(Doctor.employee_id == emp_id_upper).first()
    if doctor and doctor.user:
        return doctor.user

    return None


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login with email OR employee_id (for doctors) + password.
    Returns JWT token with role embedded.
    """
    user = _find_user_by_login(form_data.username, db)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive. Contact admin.")

    # Resolve employee_id if doctor
    employee_id = None
    if user.role == UserRole.doctor and user.doctor:
        employee_id = user.doctor.employee_id

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info(f"Login: {user.email} ({user.role})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": str(user.id),
        "email": user.email,
        "employee_id": employee_id,
    }


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    """
    Revokes the current JWT token by adding it to the blacklist.
    Required for HIPAA/GDPR secure session termination.
    """
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    jti = payload.get("jti")
    exp = payload.get("exp")
    
    if jti and exp:
        # Convert exp timestamp to datetime
        expire_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
        
        # Check if already blacklisted
        existing = db.query(BlacklistedToken).filter(BlacklistedToken.jti == jti).first()
        if not existing:
            blacklisted = BlacklistedToken(jti=jti, expires_at=expire_dt)
            db.add(blacklisted)
            db.commit()
            logger.info(f"Token revoked: jti={jti}")
            
    return {"message": "Successfully logged out"}


class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

@router.post("/password-reset/request")
def request_password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Step 1: Generate OTP and send via email.
    """
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email_index == get_blind_index(email)).first()
    
    if not user:
        return {"message": "If an account exists with this email, an OTP has been sent."}

    otp_code = f"{random.randint(100000, 999999)}"
    
    # Invalidate old OTPs
    db.query(OTPRecord).filter(
        OTPRecord.email_index == get_blind_index(email),
        OTPRecord.purpose == "password_reset",
        OTPRecord.is_used == False
    ).update({"is_used": True})

    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp_rec = OTPRecord(
        email=email,
        code=otp_code,
        purpose="password_reset",
        expires_at=expires
    )
    db.add(otp_rec)
    db.commit()

    send_otp_email(email, otp_code)
    return {"message": "OTP sent to your registered email."}

@router.post("/password-reset/confirm")
def confirm_password_reset(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Step 2: Verify OTP and update password.
    """
    email = req.email.lower().strip()
    now = datetime.now(timezone.utc)
    
    otp_rec = db.query(OTPRecord).filter(
        OTPRecord.email_index == get_blind_index(email),
        OTPRecord.code == req.otp,
        OTPRecord.purpose == "password_reset",
        OTPRecord.is_used == False,
        OTPRecord.expires_at > now
    ).first()

    if not otp_rec:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user = db.query(User).filter(User.email_index == get_blind_index(email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    otp_rec.is_used = True
    db.commit()
    
    logger.info(f"Password reset successful for user: {email}")
    return {"message": "Password reset successfully. You can now log in."}
