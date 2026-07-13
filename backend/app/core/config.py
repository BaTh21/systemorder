from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Admin123@localhost:5432/ecommerce"
    SECRET_KEY: str = "33982b6987efb1c72f8eae8982cd6ec9877afa0d2746583dff1c44beb7e5e8b1"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TELEGRAM_BOT_TOKEN: str = "8702317569:AAGMTgeMDVSxcJmXcxLYK_HQYqOjUA3tcyc"
    TELEGRAM_ADMIN_CHAT_ID: str = "1172933097"
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    SERVICE_FEE_RATE: float = 0.05

    class Config:
        env_file = ".env"
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str):
            return raw_val.strip() if isinstance(raw_val, str) else raw_val
settings = Settings()
print(f"SECRET_KEY loaded: '{settings.SECRET_KEY}'")
print(f"SECRET_KEY length: {len(settings.SECRET_KEY)}")