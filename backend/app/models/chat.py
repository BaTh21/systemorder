# app/models/chat.py
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_name = Column(String(255), nullable=False)
    sender_email = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")
    is_admin_reply = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    reaction = Column(String(50), nullable=True)
    session_id = Column(String(255), index=True)
    
    user = relationship("User")