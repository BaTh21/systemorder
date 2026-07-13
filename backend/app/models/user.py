# app/models/user.py
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, Integer
from app.models.base import Base, TimestampMixin
import enum

class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(SQLEnum(UserRole), default=UserRole.customer)
    is_active = Column(Boolean, default=True)
    telegram_chat_id = Column(String, nullable=True)