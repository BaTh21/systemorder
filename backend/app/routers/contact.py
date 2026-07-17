# app/routers/contact.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/contact", tags=["contact"])

class ContactMessage(BaseModel):
    name: str
    email: str
    subject: str
    message: str
    order_id: Optional[str] = None

@router.post("")
async def send_contact_message(
    data: ContactMessage,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Send contact message"""
    
    print(f"""
📧 New Contact Message
From: {data.name} ({data.email})
Subject: {data.subject}
Order: {data.order_id or 'N/A'}
Message: {data.message}
    """)
    
    return {
        "message": "Your message has been sent! We'll reply within 24 hours.",
        "ticket_id": f"TKT-{abs(hash(data.email)) % 10000:04d}"
    }