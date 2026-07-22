# app/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    sender_name: str = "Customer"
    sender_email: Optional[str] = None
    session_id: Optional[str] = None

class AdminReply(BaseModel):
    message: str
    session_id: str
    admin_name: str = "Admin"

@router.post("/send")
async def send_message(
    data: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Customer sends a message - SAVED TO DATABASE"""
    
    session_id = data.session_id or str(uuid.uuid4())
    
    # 🔴 SAVE CUSTOMER MESSAGE
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=data.sender_name or (current_user.full_name if current_user else "Guest"),
        sender_email=data.sender_email or (current_user.email if current_user else None),
        message=data.message,
        session_id=session_id,
        is_admin_reply=False,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    print(f"💾 Saved customer message: {msg.id} - Session: {session_id}")
    
    return {
        "message": "Message sent",
        "session_id": session_id,
        "id": msg.id
    }


@router.post("/admin/reply")
async def admin_reply(
    data: AdminReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin replies - SAVED TO DATABASE"""
    
    # 🔴 SAVE ADMIN REPLY
    reply = ChatMessage(
        user_id=current_user.id,
        sender_name=data.admin_name or f"Admin - {current_user.full_name}",
        sender_email=current_user.email,
        message=data.message,
        session_id=data.session_id,
        is_admin_reply=True,
        is_read=True,
    )
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    
    print(f"💾 Saved admin reply: {reply.id} - Session: {data.session_id}")
    
    return {
        "message": "Reply sent",
        "id": reply.id,
        "session_id": data.session_id
    }


@router.get("/messages/{session_id}")
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a session - LOADED FROM DATABASE"""
    
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    print(f"📩 Loaded {len(messages)} messages for session: {session_id}")
    
    return [
        {
            "id": m.id,
            "sender_name": m.sender_name,
            "message": m.message,
            "is_admin_reply": m.is_admin_reply,
            "is_read": m.is_read,
            "session_id": m.session_id,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


@router.get("/admin/sessions")
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all unique chat sessions with latest message"""
    
    # Get distinct sessions with their latest message
    result = await db.execute(
        select(ChatMessage)
        .order_by(ChatMessage.created_at.desc())
    )
    all_messages = result.scalars().all()
    
    # Group by session_id
    sessions = {}
    for msg in all_messages:
        if msg.session_id not in sessions:
            sessions[msg.session_id] = {
                "session_id": msg.session_id,
                "sender_name": msg.sender_name,
                "sender_email": msg.sender_email,
                "last_message": msg.message[:100],
                "unread": 0 if msg.is_admin_reply else 1,
                "created_at": str(msg.created_at),
            }
    
    return list(sessions.values())

@router.put("/read/{session_id}")
async def mark_as_read(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Mark all messages in a session as read"""
    
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.is_admin_reply == False,
            ChatMessage.is_read == False,
        )
    )
    messages = result.scalars().all()
    
    for msg in messages:
        msg.is_read = True
    
    await db.commit()
    
    return {"message": f"Marked {len(messages)} messages as read"}


# Update admin/sessions to return correct unread count
@router.get("/admin/sessions")
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all unique chat sessions with unread count"""
    
    # Get all messages grouped by session
    result = await db.execute(
        select(ChatMessage)
        .order_by(ChatMessage.created_at.desc())
    )
    all_messages = result.scalars().all()
    
    sessions = {}
    for msg in all_messages:
        if msg.session_id not in sessions:
            sessions[msg.session_id] = {
                "session_id": msg.session_id,
                "sender_name": msg.sender_name if not msg.is_admin_reply else "Customer",
                "sender_email": msg.sender_email,
                "last_message": msg.message[:100],
                "unread": 0,
                "created_at": str(msg.created_at),
            }
    
    # Count unread messages per session
    for msg in all_messages:
        if not msg.is_admin_reply and not msg.is_read:
            if msg.session_id in sessions:
                sessions[msg.session_id]["unread"] += 1
    
    return list(sessions.values())