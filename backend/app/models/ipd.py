import uuid, enum
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class BedStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"

class Bed(Base):
    __tablename__ = "beds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ward = Column(String(100), nullable=False)
    bed_number = Column(String(20), nullable=False, unique=True)
    bed_type = Column(String(50), default="general")
    status = Column(Enum(BedStatus), default=BedStatus.available)
    admissions = relationship("Admission", back_populates="bed")

class Admission(Base):
    __tablename__ = "admissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    bed_id = Column(UUID(as_uuid=True), ForeignKey("beds.id"), nullable=False)
    admission_date = Column(DateTime(timezone=True), server_default=func.now())
    discharge_date = Column(DateTime(timezone=True), nullable=True)
    diagnosis = Column(Text, nullable=True)
    status = Column(String(20), default="admitted")
    notes = Column(Text, nullable=True)
    patient = relationship("Patient", back_populates="admissions")
    doctor = relationship("Doctor", back_populates="admissions")
    bed = relationship("Bed", back_populates="admissions")
