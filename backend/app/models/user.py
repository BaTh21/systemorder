# app/models/user.py
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import enum
from datetime import datetime

class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"

class UserStatus(str, enum.Enum):
    pending = "pending"        # Waiting for admin approval
    approved = "approved"      # Approved by admin
    rejected = "rejected"      # Rejected by admin
    suspended = "suspended"    # Suspended by admin

class NotificationType(str, enum.Enum):
    account_approved = "account_approved"
    account_rejected = "account_rejected"
    order_created = "order_created"
    order_updated = "order_updated"
    payment_received = "payment_received"
    shipping_update = "shipping_update"
    order_completed = "order_completed"
    promotion = "promotion"

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.customer)
    status = Column(SQLEnum(UserStatus), default=UserStatus.pending)
    is_active = Column(Boolean, default=True)
    telegram_chat_id = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # Admin tracking
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String, nullable=True)
    
    # Relationships
    approved_by = relationship("User", remote_side=[id])
    notifications = relationship("UserNotification", back_populates="user", cascade="all, delete-orphan")


# ✅ User Notification Model
class UserNotification(Base, TimestampMixin):
    __tablename__ = "user_notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    data = Column(JSON, nullable=True) 
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications") 