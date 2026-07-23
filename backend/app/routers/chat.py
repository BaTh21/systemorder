# app/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.services.cloudinary_service import upload_image, upload_voice, upload_file_attachment
import uuid
import json

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

class EditMessageRequest(BaseModel):
    message: str

class ReactionRequest(BaseModel):
    reaction: str


# ===== SEND MESSAGE (Customer) =====
@router.post("/send")
async def send_message(
    data: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Customer sends a message"""
    session_id = data.session_id or str(uuid.uuid4())
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=data.sender_name or (current_user.full_name if current_user else "Guest"),
        sender_email=data.sender_email or (current_user.email if current_user else None),
        message=data.message,
        session_id=session_id,
        is_admin_reply=False,
        message_type="text",
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    return {"message": "Message sent", "session_id": session_id, "id": msg.id}


# ===== ADMIN REPLY =====
@router.post("/admin/reply")
async def admin_reply(
    data: AdminReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin replies to customer"""
    reply = ChatMessage(
        user_id=current_user.id,
        sender_name=data.admin_name or f"Admin - {current_user.full_name}",
        sender_email=current_user.email,
        message=data.message,
        session_id=data.session_id,
        is_admin_reply=True,
        is_read=True,
        message_type="text",
    )
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    
    return {"message": "Reply sent", "id": reply.id, "session_id": data.session_id}


# ===== UPLOAD IMAGE =====
@router.post("/upload/image")
async def upload_chat_image(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    is_admin: bool = Form(False), 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload image to chat"""
    result = await upload_image(file, folder="chat/images")
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=current_user.full_name if current_user else "Guest",
        sender_email=current_user.email if current_user else None,
        message=result["url"],
        session_id=session_id,
        message_type="image",
        is_admin_reply=is_admin, 
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    return {"url": result["url"], "id": msg.id}



# ===== UPLOAD FILE =====
@router.post("/upload/file")
async def upload_chat_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    is_admin: bool = Form(False), 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload file to chat"""
    result = await upload_file_attachment(file, folder="chat/files")
    
    file_info = {"url": result["url"], "name": file.filename, "size": file.size if hasattr(file, 'size') else 0}
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=current_user.full_name if current_user else "Guest",
        sender_email=current_user.email if current_user else None,
        message=json.dumps(file_info),
        session_id=session_id,
        message_type="file",
        is_admin_reply=is_admin,  
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    return {"url": result["url"], "name": file.filename, "size": file_info["size"], "id": msg.id}



# ===== UPLOAD VOICE =====
@router.post("/upload/voice")
async def upload_chat_voice(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    duration: int = Form(0),
    is_admin: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload voice message"""
    print(f"🎤 Voice upload: duration={duration}s, is_admin={is_admin}") 
    
    result = await upload_voice(file, folder="chat/voice")
    
    voice_info = {
        "url": result["url"],
        "duration": duration,
    }
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=current_user.full_name if current_user else "Guest",
        sender_email=current_user.email if current_user else None,
        message=json.dumps(voice_info),
        session_id=session_id,
        message_type="voice",
        is_admin_reply=is_admin,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    print(f"✅ Voice saved: {msg.id}, duration={duration}")
    
    return {"url": result["url"], "duration": duration, "id": msg.id}

# ===== GET MESSAGES =====
@router.get("/messages/{session_id}")
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a session"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        {
            "id": m.id,
            "sender_name": m.sender_name,
            "sender_email": m.sender_email,
            "message": m.message,
            "message_type": m.message_type or "text",
            "is_admin_reply": m.is_admin_reply,
            "is_read": m.is_read,
            "is_edited": m.is_edited,
            "reaction": m.reaction,
            "session_id": m.session_id,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


# ===== MARK AS READ =====
@router.put("/read/{session_id}")
async def mark_as_read(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Mark all messages in a session as read"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id, ChatMessage.is_read == False)
    )
    messages = result.scalars().all()
    for msg in messages:
        msg.is_read = True
    await db.commit()
    return {"message": f"Marked {len(messages)} as read"}


# ===== ADMIN SESSIONS LIST =====
@router.get("/admin/sessions")
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all unique chat sessions"""
    result = await db.execute(select(ChatMessage).order_by(ChatMessage.created_at.desc()))
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
    
    for msg in all_messages:
        if not msg.is_admin_reply and not msg.is_read:
            if msg.session_id in sessions:
                sessions[msg.session_id]["unread"] += 1
    
    return list(sessions.values())


# ===== EDIT MESSAGE =====
@router.put("/messages/{message_id}")
async def edit_message(
    message_id: int,
    data: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit a chat message"""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    if current_user.role != "admin" and current_user.id != msg.user_id:
        raise HTTPException(403, "Cannot edit this message")
    
    msg.message = data.message
    msg.is_edited = True
    await db.commit()
    await db.refresh(msg)
    
    return {"message": "Message updated", "id": msg.id, "text": msg.message, "is_edited": msg.is_edited}


# ===== DELETE MESSAGE =====
@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat message"""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    if current_user.role != "admin" and current_user.id != msg.user_id:
        raise HTTPException(403, "Cannot delete this message")
    
    await db.delete(msg)
    await db.commit()
    
    return {"message": "Message deleted", "id": message_id}


# ===== ADD REACTION =====
@router.post("/messages/{message_id}/reaction")
async def add_reaction(
    message_id: int,
    data: ReactionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add or remove reaction from message"""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    if msg.reaction == data.reaction:
        msg.reaction = None
    else:
        msg.reaction = data.reaction
    
    await db.commit()
    
    return {"message": "Reaction updated", "id": msg.id, "reaction": msg.reaction}