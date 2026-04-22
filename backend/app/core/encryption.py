import base64
import os
import hashlib
import hmac
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

# Load and decode the key
try:
    _KEY = base64.b64decode(settings.PII_ENCRYPTION_KEY)
except Exception:
    # Fallback for dev if key is not valid base64
    _KEY = hashlib.sha256(settings.PII_ENCRYPTION_KEY.encode()).digest()

if len(_KEY) != 32:
    # If it's not 32 bytes, hash it to make it 32 bytes
    _KEY = hashlib.sha256(_KEY).digest()

_aesgcm = AESGCM(_KEY)

def encrypt_pii(data: str | None) -> str | None:
    """Encrypt PII using AES-256-GCM."""
    if data is None:
        return None
    if not isinstance(data, str):
        data = str(data)
    
    nonce = os.urandom(12)
    ciphertext = _aesgcm.encrypt(nonce, data.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_pii(encrypted_data: str | None) -> str | None:
    """Decrypt PII using AES-256-GCM."""
    if encrypted_data is None:
        return None
    try:
        raw_data = base64.b64decode(encrypted_data)
        if len(raw_data) < 13: # 12 bytes nonce + at least 1 byte ciphertext/tag
            return encrypted_data
        nonce = raw_data[:12]
        ciphertext = raw_data[12:]
        return _aesgcm.decrypt(nonce, ciphertext, None).decode()
    except Exception:
        # In case of malformed data, wrong key, or if it wasn't encrypted
        return encrypted_data

def get_blind_index(data: str | None) -> str | None:
    """Generate a blind index (HMAC-SHA256) for searchable PII fields."""
    if data is None:
        return None
    # Use a separate derivation for the blind index key
    # Using the PII key itself as the HMAC key is acceptable if we prepend a salt/purpose
    h = hmac.new(_KEY, b"blind-index:" + str(data).lower().strip().encode(), hashlib.sha256)
    return h.hexdigest()
