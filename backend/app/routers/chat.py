# app/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.services.cloudinary_service import upload_image, upload_voice, upload_file_attachment
from app.services.websocket_manager import manager
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
    """Customer sends a message - Returns real database ID"""
    session_id = data.session_id or str(uuid.uuid4())
    
    if current_user:
        sender_name = current_user.full_name or data.sender_name
        sender_email = current_user.email or data.sender_email
    else:
        sender_name = data.sender_name if data.sender_name != "Guest" else "Customer"
        sender_email = data.sender_email
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=sender_name,
        sender_email=sender_email,
        message=data.message,
        session_id=session_id,
        is_admin_reply=False,
        message_type="text",
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Return the REAL database ID
    return {
        "message": "Message sent", 
        "session_id": session_id, 
        "id": msg.id,  # Real database ID
        "sender_name": sender_name
    }


# ===== ADMIN REPLY =====
@router.post("/admin/reply")
async def admin_reply(
    data: AdminReply,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin replies to customer - Returns real database ID"""
    if current_user.role.value != "admin":
        raise HTTPException(403, "Only admins can reply")
    
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
    
    # Send WebSocket notification with REAL ID
    await manager.reply_to_customer(data.session_id, {
        "type": "admin_reply",
        "message": data.message,
        "message_type": "text",
        "admin_name": data.admin_name or current_user.full_name,
        "timestamp": str(reply.created_at),
        "message_id": reply.id  # Real database ID
    })
    
    return {
        "message": "Reply sent", 
        "id": reply.id,  # Real database ID
        "session_id": data.session_id
    }


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
    
    if is_admin and current_user:
        sender_name = current_user.full_name
        sender_email = current_user.email
    elif current_user:
        sender_name = current_user.full_name or "Customer"
        sender_email = current_user.email
    else:
        sender_name = "Customer"
        sender_email = None
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=sender_name,
        sender_email=sender_email,
        message=result["url"],
        session_id=session_id,
        message_type="image",
        is_admin_reply=is_admin, 
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Notify with REAL ID
    if is_admin:
        await manager.reply_to_customer(session_id, {
            "type": "admin_reply",
            "message": result["url"],
            "message_type": "image",
            "image_url": result["url"],
            "admin_name": sender_name,
            "timestamp": str(msg.created_at),
            "message_id": msg.id  # Real ID
        })
    else:
        await manager.notify_admins({
            "type": "customer_message",
            "session_id": session_id,
            "message": result["url"],
            "message_type": "image",
            "image_url": result["url"],
            "sender_name": sender_name,
            "sender_email": sender_email,
            "timestamp": str(msg.created_at),
            "message_id": msg.id  # Real ID
        })
    
    return {"url": result["url"], "id": msg.id, "sender_name": sender_name}


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
    
    file_info = {
        "url": result["url"], 
        "name": file.filename, 
        "size": file.size if hasattr(file, 'size') else 0
    }
    
    if is_admin and current_user:
        sender_name = current_user.full_name
        sender_email = current_user.email
    elif current_user:
        sender_name = current_user.full_name or "Customer"
        sender_email = current_user.email
    else:
        sender_name = "Customer"
        sender_email = None
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=sender_name,
        sender_email=sender_email,
        message=json.dumps(file_info),
        session_id=session_id,
        message_type="file",
        is_admin_reply=is_admin,  
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Notify with REAL ID
    if is_admin:
        await manager.reply_to_customer(session_id, {
            "type": "admin_reply",
            "message": json.dumps(file_info),
            "message_type": "file",
            "file_data": file_info,
            "admin_name": sender_name,
            "timestamp": str(msg.created_at),
            "message_id": msg.id
        })
    else:
        await manager.notify_admins({
            "type": "customer_message",
            "session_id": session_id,
            "message": json.dumps(file_info),
            "message_type": "file",
            "file_data": file_info,
            "sender_name": sender_name,
            "sender_email": sender_email,
            "timestamp": str(msg.created_at),
            "message_id": msg.id
        })
    
    return {
        "url": result["url"], 
        "name": file.filename, 
        "size": file_info["size"], 
        "id": msg.id,
        "sender_name": sender_name
    }


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
    result = await upload_voice(file, folder="chat/voice")
    
    voice_info = {
        "url": result["url"],
        "duration": duration,
    }
    
    if is_admin and current_user:
        sender_name = current_user.full_name
        sender_email = current_user.email
    elif current_user:
        sender_name = current_user.full_name or "Customer"
        sender_email = current_user.email
    else:
        sender_name = "Customer"
        sender_email = None
    
    msg = ChatMessage(
        user_id=current_user.id if current_user else None,
        sender_name=sender_name,
        sender_email=sender_email,
        message=json.dumps(voice_info),
        session_id=session_id,
        message_type="voice",
        is_admin_reply=is_admin,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    # Notify with REAL ID
    if is_admin:
        await manager.reply_to_customer(session_id, {
            "type": "admin_reply",
            "message": json.dumps(voice_info),
            "message_type": "voice",
            "voice_url": result["url"],
            "voice_duration": duration,
            "admin_name": sender_name,
            "timestamp": str(msg.created_at),
            "message_id": msg.id
        })
    else:
        await manager.notify_admins({
            "type": "customer_message",
            "session_id": session_id,
            "message": json.dumps(voice_info),
            "message_type": "voice",
            "voice_url": result["url"],
            "voice_duration": duration,
            "sender_name": sender_name,
            "sender_email": sender_email,
            "timestamp": str(msg.created_at),
            "message_id": msg.id
        })
    
    return {
        "url": result["url"], 
        "duration": duration, 
        "id": msg.id,
        "sender_name": sender_name
    }


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
            "user_id": m.user_id,
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
    result = await db.execute(
        select(ChatMessage).order_by(ChatMessage.created_at.desc())
    )
    all_messages = result.scalars().all()
    
    sessions = {}
    
    for msg in all_messages:
        if msg.session_id not in sessions:
            sessions[msg.session_id] = {
                "session_id": msg.session_id,
                "sender_name": "Customer",
                "sender_email": None,
                "last_message": msg.message[:100] if msg.message else "",
                "unread": 0,
                "created_at": str(msg.created_at),
                "user_id": msg.user_id,
            }
    
    for msg in all_messages:
        if msg.session_id in sessions:
            if not msg.is_admin_reply and not msg.is_read:
                sessions[msg.session_id]["unread"] += 1
            
            if not msg.is_admin_reply and msg.sender_name and msg.sender_name not in ["Guest", "Customer", ""]:
                sessions[msg.session_id]["sender_name"] = msg.sender_name
                if msg.sender_email:
                    sessions[msg.session_id]["sender_email"] = msg.sender_email
            
            if msg.user_id and not msg.is_admin_reply:
                user_result = await db.execute(select(User).where(User.id == msg.user_id))
                user = user_result.scalars().first()
                if user:
                    sessions[msg.session_id]["sender_name"] = user.full_name
                    sessions[msg.session_id]["sender_email"] = user.email
    
    return list(sessions.values())


# ===== GET CUSTOMER PROFILE =====
@router.get("/customer-profile/{session_id}")
async def get_customer_profile(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get customer profile for a chat session"""
    
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.is_admin_reply == False
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    latest_msg = result.scalars().first()
    
    if not latest_msg:
        return {
            "session_id": session_id,
            "name": "Customer",
            "email": None,
            "phone": None,
            "is_registered": False,
            "user_id": None
        }
    
    if latest_msg.user_id:
        user_result = await db.execute(select(User).where(User.id == latest_msg.user_id))
        user = user_result.scalars().first()
        if user:
            return {
                "session_id": session_id,
                "name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "is_registered": True,
                "user_id": user.id,
                "is_active": user.is_active
            }
    
    return {
        "session_id": session_id,
        "name": latest_msg.sender_name if latest_msg.sender_name not in ["Guest", "Customer", ""] else "Customer",
        "email": latest_msg.sender_email,
        "phone": None,
        "is_registered": False,
        "user_id": latest_msg.user_id
    }


# ===== EDIT MESSAGE =====
@router.put("/messages/{message_id}")
async def edit_message(
    message_id: int,
    data: EditMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Edit a chat message - Uses real database ID"""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    is_admin = current_user.role.value == "admin" if hasattr(current_user, 'role') and current_user.role else False
    
    if is_admin:
        if not msg.is_admin_reply:
            raise HTTPException(403, "Cannot edit customer messages")
    else:
        if msg.is_admin_reply:
            raise HTTPException(403, "Cannot edit admin messages")
        if msg.user_id and msg.user_id != current_user.id:
            raise HTTPException(403, "Cannot edit other user's messages")
    
    msg.message = data.message
    msg.is_edited = True
    await db.commit()
    await db.refresh(msg)
    
    edit_data = {
        "type": "message_edited",
        "message_id": msg.id,  # Real database ID
        "session_id": msg.session_id,
        "new_message": data.message,
        "is_edited": True,
        "timestamp": str(msg.updated_at) if hasattr(msg, 'updated_at') else str(msg.created_at)
    }
    
    if is_admin:
        await manager.reply_to_customer(msg.session_id, edit_data)
    else:
        await manager.notify_admins(edit_data)
    
    return {
        "message": "Message updated", 
        "id": msg.id, 
        "text": msg.message, 
        "is_edited": msg.is_edited
    }


# ===== DELETE MESSAGE =====
@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat message - Users can delete their own messages (text, image, file, voice)"""
    msg = await db.get(ChatMessage, message_id)
    if not msg:
        raise HTTPException(404, "Message not found")
    
    is_admin = current_user.role.value == "admin" if hasattr(current_user, 'role') and current_user.role else False
    
    if is_admin:
        # Admin can only delete their own messages
        if not msg.is_admin_reply:
            raise HTTPException(403, "Cannot delete customer messages")
    else:
        # Customer can only delete their own messages
        if msg.is_admin_reply:
            raise HTTPException(403, "Cannot delete admin messages")
        if msg.user_id and msg.user_id != current_user.id:
            raise HTTPException(403, "Cannot delete other user's messages")
    
    session_id = msg.session_id
    
    await db.delete(msg)
    await db.commit()
    
    # Send real-time notification
    delete_data = {
        "type": "message_deleted",
        "message_id": message_id,
        "session_id": session_id
    }
    
    if is_admin:
        await manager.reply_to_customer(session_id, delete_data)
    else:
        await manager.notify_admins(delete_data)
    
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
    print(f"🔍 Reaction request - Message ID: {message_id}, Reaction: {data.reaction}")
    
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id)
    )
    msg = result.scalars().first()
    
    if not msg:
        print(f"❌ Message not found: {message_id}")
        raise HTTPException(404, f"Message not found with ID: {message_id}")
    
    # Toggle reaction
    if msg.reaction == data.reaction:
        msg.reaction = None
        new_reaction = None
        print(f"🔄 Removing reaction (was: {data.reaction})")
    else:
        msg.reaction = data.reaction
        new_reaction = data.reaction
        print(f"🔄 Setting reaction: {data.reaction}")
    
    await db.commit()
    await db.refresh(msg)
    
    print(f"✅ Reaction saved - Message {msg.id}: {msg.reaction}")
    
    is_admin = current_user.role.value == "admin" if hasattr(current_user, 'role') and current_user.role else False
    
    # Send to BOTH sides - include null if reaction was removed
    reaction_data = {
        "type": "message_reaction",
        "message_id": msg.id,
        "session_id": msg.session_id,
        "reaction": new_reaction,  # None if removed
        "reacted_by": current_user.full_name or "User"
    }
    
    if is_admin:
        await manager.reply_to_customer(msg.session_id, reaction_data)
        print(f"📤 Notified customer about reaction: {new_reaction}")
    else:
        await manager.notify_admins(reaction_data)
        print(f"📤 Notified admins about reaction: {new_reaction}")
    
    return {
        "message": "Reaction updated", 
        "id": msg.id, 
        "reaction": msg.reaction
    }