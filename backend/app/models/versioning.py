import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base

class PrescriptionVersion(Base):
    """
    Immutable history of medical prescriptions.
    Captures a snapshot of the diagnosis and items whenever changed.
    """
    __tablename__ = "prescription_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prescription_id = Column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=False)
    
    # Snapshot of the data at this version
    diagnosis = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    items_snapshot = Column(JSON, nullable=False) # List of dicts representing medicines
    
    version_number = Column(String, nullable=False) # e.g. "v1", "v2"
    changed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
