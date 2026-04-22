import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base

class AuditLog(Base):
    """
    Mandatory Access Auditing for HIPAA/GDPR/DISHA compliance.
    Records who accessed which patient record and when.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True) # The staff/doctor/admin
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True) # The patient whose data was accessed
    
    action = Column(String, nullable=False) # e.g., "VIEW_PATIENT_DETAILS", "LIST_PATIENTS", "EXPORT_REPORT"
    resource_type = Column(String, nullable=True) # e.g., "Patient", "Prescription", "LabResult"
    resource_id = Column(String, nullable=True) # The UUID of the specific object accessed
    
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
