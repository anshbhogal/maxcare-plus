from sqlalchemy import TypeDecorator, String
from app.core.encryption import encrypt_pii, decrypt_pii

class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator for transparent encryption/decryption of PII.
    Stores data as an encrypted base64 string in the database.
    """
    impl = String

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_pii(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_pii(value)
