import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TELEGRAM_BOT_TOKEN: str
    TELEGRAM_ADMIN_CHAT_ID: str
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    SERVICE_FEE_RATE: float = 0.05
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Payment Settings
    BANK_NAME: str = "ABA Bank"
    BANK_ACCOUNT_NAME: str = "TeleShop Inc."
    BANK_ACCOUNT_NUMBER: str = "000123456789"
    BANK_SWIFT_CODE: str = "ABAAKHPP"
    BANK_ROUTING_NUMBER: str = "021000021"
    QR_CODE_URL: str = "/uploads/payments/qr-code.png"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Create upload directories
os.makedirs(os.path.join(settings.UPLOAD_DIR, "products"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "categories"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "payments"), exist_ok=True)