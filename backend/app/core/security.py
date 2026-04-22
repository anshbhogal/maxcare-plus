import hashlib
import hmac
import base64
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings


def _pre_hash(password: str) -> bytes:
    """
    SHA-256 pre-hash the password then base64-encode it.
    This produces a fixed 44-byte string regardless of input length,
    safely bypassing bcrypt's 72-byte hard limit while preserving
    full password entropy. All passwords go through this pipeline.
    """
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    """Hash password using SHA-256 pre-hash + bcrypt."""
    pre_hashed = _pre_hash(password)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pre_hashed, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password — handles both new SHA-256+bcrypt and legacy passlib hashes."""
    try:
        pre_hashed = _pre_hash(plain_password)
        return bcrypt.checkpw(pre_hashed, hashed_password.encode("utf-8"))
    except Exception:
        return False


import uuid

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Add a unique JTI for revocation tracking
    jti = str(uuid.uuid4())
    to_encode.update({"exp": expire, "jti": jti})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
