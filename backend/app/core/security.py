import hashlib
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
from cryptography.fernet import Fernet
import base64
from app.core.config import settings

def get_fernet_cipher() -> Fernet:
    key = settings.PAPER_ENCRYPTION_KEY.encode('utf-8')
    try:
        return Fernet(key)
    except Exception:
        derived_key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
        return Fernet(derived_key)

cipher_suite = get_fernet_cipher()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')
        if len(pw_bytes) > 72:
            pw_bytes = pw_bytes[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pw_bytes = password.encode('utf-8')
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def encrypt_paper_content(plain_content: str) -> str:
    if not plain_content:
        return ""
    encrypted_bytes = cipher_suite.encrypt(plain_content.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_paper_content(encrypted_content: str) -> str:
    if not encrypted_content:
        return ""
    try:
        decrypted_bytes = cipher_suite.decrypt(encrypted_content.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        raise ValueError("Decryption failed: content may be corrupted or key mismatched.") from e

def compute_sha256_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()
