# app/routers/chat_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
from app.core.security import decode_token
from app.core.database import async_session
from app.models.user import User
from app.models.chat import ChatMessage
from sqlalchemy import select
import json
import traceback

router = APIRouter()

@router.websocket("/ws/customer/{token}")
async def ws_customer(websocket: WebSocket, token: str):
    await websocket.accept()
    print(f"🔗 Customer WebSocket connected")
    
    user_id = None
    user_info = None
    is_authenticated = False
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id:
            try:
                async with async_session() as db:
                    user = await db.get(User, int(user_id))
                    if user:
                        user_info = {
                            "id": user.id, "full_name": user.full_name,
                            "email": user.email, "phone": user.phone, "is_active": user.is_active
                        }
                        is_authenticated = True
            except Exception as e:
                print(f"Error getting user info: {e}")
    except Exception as e:
        print(f"Token decode failed: {e}")
    
    if is_authenticated and user_info:
        session_id = f"user_{user_info['id']}"
    else:
        session_id = f"guest_{id(websocket)}"
    
    print(f"👤 Customer session: {session_id} | Auth: {is_authenticated}")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type", "")
            
            if msg_type == "connect":
                session_id = msg.get("session_id", session_id)
                manager.customer_connections[session_id] = websocket
                print(f"✅ Customer connected: {session_id}")
                print(f"📋 Active sessions: {list(manager.customer_connections.keys())}")
                continue
            
            msg_session = session_id
            if msg_session not in manager.customer_connections:
                manager.customer_connections[msg_session] = websocket
            
            if msg_type in ["text", ""]:
                try:
                    async with async_session() as db:
                        chat_msg = ChatMessage(
                            user_id=int(user_id) if is_authenticated else None,
                            sender_name=msg.get("sender_name", "Customer"),
                            sender_email=msg.get("sender_email", ""),
                            message=msg.get("message", ""),
                            session_id=msg_session,
                            is_admin_reply=False,
                            message_type="text",
                        )
                        db.add(chat_msg)
                        await db.commit()
                        await db.refresh(chat_msg)
                        print(f"💾 Message saved - ID: {chat_msg.id} | Session: {msg_session}")
                        
                        await websocket.send_text(json.dumps({
                            "type": "message_sent", "message_id": chat_msg.id,
                            "message": msg.get("message", ""), "message_type": "text",
                            "sender_name": msg.get("sender_name", "Customer"),
                            "timestamp": msg.get("timestamp", ""), "session_id": msg_session
                        }))
                        
                        await manager.notify_admins({
                            "type": "customer_message", "from_user_id": user_id,
                            "session_id": msg_session, "sender_name": msg.get("sender_name", "Customer"),
                            "sender_email": msg.get("sender_email", ""), "message": msg.get("message", ""),
                            "message_type": "text", "timestamp": msg.get("timestamp", ""),
                            "message_id": chat_msg.id, "customer_profile": user_info
                        })
                except Exception as e:
                    print(f"❌ Error saving message: {e}")
                    traceback.print_exc()
            
            elif msg_type in ["image", "file", "voice"]:
                await manager.notify_admins({
                    "type": "customer_message", "from_user_id": user_id,
                    "session_id": msg_session, "sender_name": msg.get("sender_name", "Customer"),
                    "sender_email": msg.get("sender_email", ""), "message_type": msg_type,
                    "image_url": msg.get("image_url"), "file_data": msg.get("file_data"),
                    "voice_url": msg.get("voice_url"), "voice_duration": msg.get("voice_duration"),
                    "timestamp": msg.get("timestamp", ""), "customer_profile": user_info
                })
            
            elif msg_type == "message_reaction":
                try:
                    async with async_session() as db:
                        result = await db.execute(select(ChatMessage).where(ChatMessage.id == msg.get("message_id")))
                        chat_msg = result.scalars().first()
                        if chat_msg:
                            new_reaction = msg.get("reaction")
                            chat_msg.reaction = None if (new_reaction is None or new_reaction == "null") else new_reaction
                            await db.commit()
                except Exception as e:
                    print(f"❌ Error saving reaction: {e}")
                
                await manager.notify_admins({
                    "type": "message_reaction", "message_id": msg.get("message_id"),
                    "session_id": msg_session, "reaction": msg.get("reaction"),
                    "reacted_by": msg.get("sender_name", "Customer")
                })
            
            elif msg_type == "message_edited":
                await manager.notify_admins({
                    "type": "message_edited", "message_id": msg.get("message_id"),
                    "session_id": msg_session, "new_message": msg.get("new_message")
                })
            
            elif msg_type == "message_deleted":
                await manager.notify_admins({
                    "type": "message_deleted", "message_id": msg.get("message_id"),
                    "session_id": msg_session
                })
                
    except WebSocketDisconnect:
        print(f"🔌 Customer disconnected: {session_id}")
        for sid, ws in list(manager.customer_connections.items()):
            if ws == websocket:
                del manager.customer_connections[sid]
    except Exception as e:
        print(f"❌ Customer WebSocket error: {e}")
        traceback.print_exc()


@router.websocket("/ws/admin/{token}")
async def ws_admin(websocket: WebSocket, token: str):
    await websocket.accept()
    print(f"🔗 Admin WebSocket connected")
    
    user = None
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        async with async_session() as db:
            user = await db.get(User, user_id)
            if not user or user.role.value != "admin":
                await websocket.close(code=4003)
                return
    except Exception as e:
        await websocket.close(code=4001)
        return
    
    manager.admin_connections.append(websocket)
    print(f"✅ Admin connected: {user.full_name}")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            session_id = msg.get("session_id")
            
            if session_id:
                msg_type = msg.get("type", "text")
                print(f"📤 Admin sending to session: {session_id}")
                
                if msg_type in ["text", ""]:
                    try:
                        async with async_session() as db:
                            reply = ChatMessage(
                                user_id=user.id, sender_name=msg.get("admin_name", "Admin"),
                                sender_email=user.email, message=msg.get("message", ""),
                                session_id=session_id, is_admin_reply=True, is_read=True, message_type="text",
                            )
                            db.add(reply)
                            await db.commit()
                            await db.refresh(reply)
                            print(f"💾 Admin reply saved - ID: {reply.id}")
                            
                            await websocket.send_text(json.dumps({
                                "type": "message_sent", "message_id": reply.id,
                                "message": msg.get("message", ""), "message_type": "text",
                                "sender_name": "You", "timestamp": msg.get("timestamp", ""),
                                "session_id": session_id
                            }))
                            
                            success = await manager.reply_to_customer(session_id, {
                                "type": "admin_reply", "message": msg.get("message", ""),
                                "message_type": "text", "admin_name": msg.get("admin_name", "Admin"),
                                "timestamp": msg.get("timestamp", ""), "message_id": reply.id
                            })
                            print(f"📤 Reply sent: {success}")
                    except Exception as e:
                        print(f"❌ Error saving admin reply: {e}")
                        traceback.print_exc()
                
                elif msg_type in ["image", "file", "voice"]:
                    await manager.reply_to_customer(session_id, {
                        "type": "admin_reply", "message_type": msg_type,
                        "image_url": msg.get("image_url"), "file_data": msg.get("file_data"),
                        "voice_url": msg.get("voice_url"), "voice_duration": msg.get("voice_duration"),
                        "admin_name": msg.get("admin_name", "Admin"), "timestamp": msg.get("timestamp", ""),
                    })
                elif msg_type == "delete_session":
                    session_id = msg.get("session_id")
                    if session_id:
                        # Delete all messages from DB
                        try:
                            async with async_session() as db:
                                result = await db.execute(
                                    select(ChatMessage).where(ChatMessage.session_id == session_id)
                                )
                                messages = result.scalars().all()
                                for m in messages:
                                    await db.delete(m)
                                await db.commit()
                                print(f"🗑️ Deleted {len(messages)} messages from session: {session_id}")
                        except Exception as e:
                            print(f"❌ Error deleting session: {e}")
                        
                        # Notify customer
                        await manager.reply_to_customer(session_id, {
                            "type": "session_deleted",
                            "session_id": session_id,
                            "message": "Chat session has been ended by admin"
                        })
                        
                        # Remove customer connection
                        if session_id in manager.customer_connections:
                            del manager.customer_connections[session_id]
                
                elif msg_type == "message_reaction":
                    try:
                        async with async_session() as db:
                            result = await db.execute(select(ChatMessage).where(ChatMessage.id == msg.get("message_id")))
                            chat_msg = result.scalars().first()
                            if chat_msg:
                                new_reaction = msg.get("reaction")
                                chat_msg.reaction = None if (new_reaction is None or new_reaction == "null") else new_reaction
                                await db.commit()
                    except Exception as e:
                        print(f"❌ Error saving reaction: {e}")
                    
                    await manager.reply_to_customer(session_id, {
                        "type": "message_reaction", "message_id": msg.get("message_id"),
                        "session_id": session_id, "reaction": msg.get("reaction"), "reacted_by": "Admin"
                    })
                
                elif msg_type == "message_edited":
                    await manager.reply_to_customer(session_id, {
                        "type": "message_edited", "message_id": msg.get("message_id"),
                        "session_id": session_id, "new_message": msg.get("new_message")
                    })
                
                elif msg_type == "message_deleted":
                    await manager.reply_to_customer(session_id, {
                        "type": "message_deleted", "message_id": msg.get("message_id"),
                        "session_id": session_id
                    })
                    
    except WebSocketDisconnect:
        print(f"🔌 Admin disconnected: {user.full_name}")
        if websocket in manager.admin_connections:
            manager.admin_connections.remove(websocket)
    except Exception as e:
        print(f"❌ Admin WebSocket error: {e}")
        traceback.print_exc()
        if websocket in manager.admin_connections:
            manager.admin_connections.remove(websocket)