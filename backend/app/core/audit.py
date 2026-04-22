from fastapi import Request
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User
import uuid
import logging

logger = logging.getLogger(__name__)

def log_access(
    db: Session,
    user: User,
    action: str,
    patient_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    request: Request | None = None
):
    """
    Creates an audit log entry for HIPAA-compliant access tracking.
    """
    try:
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
            
        audit_entry = AuditLog(
            user_id=user.id,
            patient_id=patient_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        # We don't want audit logging failures to crash the main request,
        # but in a real HIPAA environment, this should be high-priority.
        logger.error(f"Failed to create audit log: {e}")
        db.rollback()
