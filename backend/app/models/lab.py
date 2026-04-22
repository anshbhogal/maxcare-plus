import uuid, enum
from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class LabTestStatus(str, enum.Enum):
    requested = "requested"
    sample_collected = "sample_collected"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"

class LabTest(Base):
    __tablename__ = "lab_tests"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    test_name = Column(String(200), nullable=False)
    status = Column(Enum(LabTestStatus), default=LabTestStatus.requested)
    result = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    appointment = relationship("Appointment", back_populates="lab_tests")
    patient = relationship("Patient", back_populates="lab_tests")
