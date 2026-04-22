import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.database import Base

class BlacklistedToken(Base):
    """
    Stores revoked JWT identifiers (JTIs) to prevent token reuse after logout.
    Required for HIPAA/GDPR session security.
    """
    __tablename__ = "blacklisted_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jti = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False) # When the token would have naturally expired
    created_at = Column(DateTime(timezone=True), server_default=func.now())
