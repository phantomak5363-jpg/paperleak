import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SecureExam - Paper Leak Detection & Prevention System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secure_exam_super_secret_jwt_key_2026_change_in_production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day token
    
    # AES-256 Encryption key for sensitive paper contents (Must be 32 URL-safe base64-encoded bytes or 32-byte key)
    # Fernet key default for prototype demonstration
    PAPER_ENCRYPTION_KEY: str = os.getenv("PAPER_ENCRYPTION_KEY", "gZ3X7_rV6_3B8p9uY1Wz2qK5t8m9L0v1P2q3R4s5T6u=")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./secure_exam.db")
    
    class Config:
        case_sensitive = True

settings = Settings()
