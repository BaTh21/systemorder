import re

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=8, max_length=20)
    
    @validator('phone')
    def validate_phone(cls, v):
        cleaned = re.sub(r'[\s\-+]', '', v)
        if not re.match(r'^(0\d{8,9})$', cleaned):
            raise ValueError('Phone must be a valid Cambodian number (e.g., 012345678)')
        return v
    
    @validator('full_name')
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        return v.strip()

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    telegram_chat_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    
class AdminUserApproval(BaseModel):
    """Schema for admin approving/rejecting a user"""
    status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection (required if status is 'rejected')")
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ['approved', 'rejected']:
            raise ValueError('Status must be "approved" or "rejected"')
        return v
    
    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if values.get('status') == 'rejected' and not v:
            raise ValueError('Rejection reason is required when status is "rejected"')
        return v

class AdminUserListResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    status: str
    created_at: datetime
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None

# ============================================
# NOTIFICATION SCHEMAS
# ============================================

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int
    total: int