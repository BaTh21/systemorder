# app/routers/contact.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.core.config import settings
import httpx

router = APIRouter(prefix="/contact", tags=["contact"])

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

class ContactMessage(BaseModel):
    name: str
    email: str
    subject: str
    message: str
    order_id: Optional[str] = None

async def send_telegram_message(chat_id: str, text: str):
    """Send message to Telegram"""
    url = f"{TELEGRAM_API}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload, timeout=10)
        except Exception as e:
            print(f"Telegram error: {e}")

@router.post("")
async def send_contact_message(
    data: ContactMessage,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user),
):
    """Send contact message to admin via Telegram"""
    
    # Build message for admin
    telegram_text = f"""
📧 <b>New Contact Message</b>

👤 <b>From:</b> {data.name}
📧 <b>Email:</b> {data.email}
📋 <b>Subject:</b> {data.subject}
🆔 <b>Order ID:</b> {data.order_id or 'N/A'}
{f"👤 <b>User:</b> {current_user.full_name} (ID: {current_user.id})" if current_user else "👤 <b>User:</b> Not logged in"}

💬 <b>Message:</b>
{data.message}
"""
    
    # Send to admin Telegram
    if settings.TELEGRAM_ADMIN_CHAT_ID:
        background_tasks.add_task(send_telegram_message, settings.TELEGRAM_ADMIN_CHAT_ID, telegram_text)
        print(f"📤 Contact message sent to admin Telegram")
    
    # Also log it
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