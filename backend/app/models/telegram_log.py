# app/models/telegram_log.py
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from app.models.base import Base, TimestampMixin

class TelegramLog(Base, TimestampMixin):
    __tablename__ = "telegram_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True) 
    message_type = Column(String)
    sent_at = Column(DateTime)