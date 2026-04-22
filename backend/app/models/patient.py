import uuid
from sqlalchemy import Column, String, Date, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from app.db.database import Base
from app.db.types import EncryptedString
from app.core.encryption import get_blind_index

class Patient(Base):
    __tablename__ = "patients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    patient_code = Column(String, unique=True, nullable=False)
    full_name = Column(EncryptedString, nullable=False)
    dob = Column(EncryptedString, nullable=True)  # Stored as encrypted string
    gender = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    phone = Column(EncryptedString, nullable=True)
    phone_index = Column(String, unique=True, nullable=True, index=True)
    address = Column(EncryptedString, nullable=True)

    # GDPR / HIPAA Compliance: Right to be Forgotten
    deletion_requested_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @validates("phone")
    def validate_phone(self, key, value):
        if value:
            self.phone_index = get_blind_index(value)
        return value

    user = relationship("User", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    bills = relationship("Bill", back_populates="patient")
    lab_tests = relationship("LabTest", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    admissions = relationship("Admission", back_populates="patient")
