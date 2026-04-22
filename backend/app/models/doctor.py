import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Float, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.db.types import EncryptedString


class Doctor(Base):
    __tablename__ = "doctors"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    employee_id      = Column(String(20), unique=True, nullable=True, index=True)  # e.g. DOC-0001
    full_name        = Column(EncryptedString, nullable=False)
    specialization   = Column(String, nullable=False)
    license_no       = Column(String, unique=True, nullable=False)
    phone            = Column(EncryptedString, nullable=True)
    is_available     = Column(Boolean, default=True)

    experience_years  = Column(Integer, nullable=True)
    qualifications    = Column(String, nullable=True)
    bio               = Column(String, nullable=True)
    avatar_color      = Column(String, nullable=True)
    consultation_fee  = Column(Integer, nullable=True)
    rating            = Column(Float, nullable=True, default=4.8)
    patients_treated  = Column(Integer, nullable=True)
    available_days    = Column(String, nullable=True)
    available_time    = Column(String, nullable=True)

    user          = relationship("User", back_populates="doctor")
    appointments  = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    admissions    = relationship("Admission", back_populates="doctor")
    shifts        = relationship("DoctorShift", back_populates="doctor", cascade="all, delete-orphan")
