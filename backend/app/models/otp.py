import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import validates
from app.db.database import Base
from app.db.types import EncryptedString
from app.core.encryption import get_blind_index


class OTPRecord(Base):
    """Stores OTPs for mobile and email verification (Login, Linking, Password Reset)."""
    __tablename__ = "otp_records"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identifier (one must be present)
    phone       = Column(EncryptedString, nullable=True)
    phone_index = Column(String, nullable=True, index=True)
    email       = Column(EncryptedString, nullable=True)
    email_index = Column(String, nullable=True, index=True)
    
    code        = Column(String(6), nullable=False)
    purpose     = Column(String(50), nullable=False, default="account_link")  # account_link | login | password_reset
    is_used     = Column(Boolean, default=False)
    attempts    = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    expires_at  = Column(DateTime(timezone=True), nullable=False)

    @validates("phone")
    def validate_phone(self, key, value):
        if value:
            self.phone_index = get_blind_index(value)
        return value

    @validates("email")
    def validate_email(self, key, value):
        if value:
            self.email_index = get_blind_index(value)
        return value
