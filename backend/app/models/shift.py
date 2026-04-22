import uuid
from sqlalchemy import Column, String, Time, ForeignKey, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum

class DayOfWeek(str, enum.Enum):
    monday = "Monday"
    tuesday = "Tuesday"
    wednesday = "Wednesday"
    thursday = "Thursday"
    friday = "Friday"
    saturday = "Saturday"
    sunday = "Sunday"

class Shift(Base):
    """
    Standard shifts defined by the hospital (e.g., "Morning Shift", "Night Duty").
    """
    __tablename__ = "shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    doctor_assignments = relationship("DoctorShift", back_populates="shift", cascade="all, delete-orphan")

class DoctorShift(Base):
    """
    Maps doctors to specific shifts on specific days.
    """
    __tablename__ = "doctor_shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id"), nullable=False)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    day_of_week = Column(Enum(DayOfWeek), nullable=False)

    doctor = relationship("Doctor", back_populates="shifts")
    shift = relationship("Shift", back_populates="doctor_assignments")
