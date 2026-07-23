# app/routers/chat_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
from app.core.security import decode_token
from app.core.database import async_session
from app.models.user import User
from app.models.chat import ChatMessage
import json
import traceback
from datetime import datetime

router = APIRouter()

@router.websocket("/ws/customer/{token}")
async def ws_customer(websocket: WebSocket, token: str):
    await websocket.accept()
    print(f"🔗 Customer WebSocket connected")
    
    user_id = None
    user_info = None
    
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if user_id:
            try:
                async with async_session() as db:
                    user = await db.get(User, int(user_id))
                    if user:
                        user_info = {
                            "id": user.id,
                            "full_name": user.full_name,
                            "email": user.email,
                            "phone": user.phone,
                            "is_active": user.is_active
                        }
            except Exception as e:
                print(f"Error getting user info: {e}")
    except Exception as e:
        print(f"Token decode failed: {e}")
        user_id = f"guest_{id(websocket)}"
    
    session_id = user_id
    print(f"👤 Customer session: {session_id}")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            msg_type = msg.get("type", "")
            
            if msg_type == "connect":
                session_id = msg.get("session_id", user_id)
                manager.customer_connections[session_id] = websocket
                print(f"✅ Customer connected to session: {session_id}")
                continue
            
            msg_session = msg.get("session_id", session_id)
            if msg_session not in manager.customer_connections:
                manager.customer_connections[msg_session] = websocket
            
            # Handle text messages
            if msg_type in ["text", ""]:
                try:
                    async with async_session() as db:
                        chat_msg = ChatMessage(
                            user_id=int(user_id) if user_id and not str(user_id).startswith("guest_") else None,
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
                        
                        print(f"💾 Customer message saved - ID: {chat_msg.id}")
                        
                        # Send confirmation BACK to the customer who sent it
                        await websocket.send_text(json.dumps({
                            "type": "message_sent",
                            "message_id": chat_msg.id,
                            "message": msg.get("message", ""),
                            "message_type": "text",
                            "sender_name": msg.get("sender_name", "Customer"),
                            "timestamp": msg.get("timestamp", ""),
                            "session_id": msg_session
                        }))
                        
                        # Send to admins
                        await manager.notify_admins({
                            "type": "customer_message",
                            "from_user_id": user_id,
                            "session_id": msg_session,
                            "sender_name": msg.get("sender_name", "Customer"),
                            "sender_email": msg.get("sender_email", ""),
                            "message": msg.get("message", ""),
                            "message_type": "text",
                            "timestamp": msg.get("timestamp", ""),
                            "message_id": chat_msg.id,
                            "customer_profile": user_info
                        })
                except Exception as e:
                    print(f"❌ Error saving customer message: {e}")
                    traceback.print_exc()
            
            # Handle image messages
            elif msg_type == "image":
                await manager.notify_admins({
                    "type": "customer_message",
                    "from_user_id": user_id,
                    "session_id": msg_session,
                    "sender_name": msg.get("sender_name", "Customer"),
                    "sender_email": msg.get("sender_email", ""),
                    "message_type": "image",
                    "image_url": msg.get("image_url"),
                    "timestamp": msg.get("timestamp", ""),
                    "customer_profile": user_info
                })
            
            # Handle file messages
            elif msg_type == "file":
                await manager.notify_admins({
                    "type": "customer_message",
                    "from_user_id": user_id,
                    "session_id": msg_session,
                    "sender_name": msg.get("sender_name", "Customer"),
                    "sender_email": msg.get("sender_email", ""),
                    "message_type": "file",
                    "file_data": msg.get("file_data"),
                    "timestamp": msg.get("timestamp", ""),
                    "customer_profile": user_info
                })
            
            # Handle voice messages
            elif msg_type == "voice":
                await manager.notify_admins({
                    "type": "customer_message",
                    "from_user_id": user_id,
                    "session_id": msg_session,
                    "sender_name": msg.get("sender_name", "Customer"),
                    "sender_email": msg.get("sender_email", ""),
                    "message_type": "voice",
                    "voice_url": msg.get("voice_url"),
                    "voice_duration": msg.get("voice_duration"),
                    "timestamp": msg.get("timestamp", ""),
                    "customer_profile": user_info
                })
            
            # Handle message_edited, message_deleted, message_reaction
            elif msg_type in ["message_edited", "message_deleted", "message_reaction"]:
                # Forward these to admins
                await manager.notify_admins({
                    "type": msg_type,
                    "message_id": msg.get("message_id"),
                    "session_id": msg_session,
                    "new_message": msg.get("new_message"),
                    "reaction": msg.get("reaction"),
                    "reacted_by": msg.get("sender_name", "Customer")
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
                print(f"❌ Not admin or user not found")
                await websocket.close(code=4003)
                return
    except Exception as e:
        print(f"❌ Admin auth failed: {e}")
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
                
                # Handle text replies
                if msg_type in ["text", ""]:
                    try:
                        async with async_session() as db:
                            reply = ChatMessage(
                                user_id=user.id,
                                sender_name=msg.get("admin_name", "Admin"),
                                sender_email=user.email,
                                message=msg.get("message", ""),
                                session_id=session_id,
                                is_admin_reply=True,
                                is_read=True,
                                message_type="text",
                            )
                            db.add(reply)
                            await db.commit()
                            await db.refresh(reply)
                            
                            print(f"💾 Admin reply saved - ID: {reply.id}")
                            
                            # Send confirmation BACK to the admin who sent it
                            await websocket.send_text(json.dumps({
                                "type": "message_sent",
                                "message_id": reply.id,
                                "message": msg.get("message", ""),
                                "message_type": "text",
                                "sender_name": "You",
                                "timestamp": msg.get("timestamp", ""),
                                "session_id": session_id
                            }))
                            
                            # Send to customer
                            await manager.reply_to_customer(session_id, {
                                "type": "admin_reply",
                                "message": msg.get("message", ""),
                                "message_type": "text",
                                "admin_name": msg.get("admin_name", "Admin"),
                                "timestamp": msg.get("timestamp", ""),
                                "message_id": reply.id
                            })
                    except Exception as e:
                        print(f"❌ Error saving admin reply: {e}")
                        traceback.print_exc()
                
                # Handle image replies
                elif msg_type == "image":
                    await manager.reply_to_customer(session_id, {
                        "type": "admin_reply",
                        "message_type": "image",
                        "image_url": msg.get("image_url"),
                        "admin_name": msg.get("admin_name", "Admin"),
                        "timestamp": msg.get("timestamp", ""),
                    })
                
                # Handle file replies
                elif msg_type == "file":
                    await manager.reply_to_customer(session_id, {
                        "type": "admin_reply",
                        "message_type": "file",
                        "file_data": msg.get("file_data"),
                        "admin_name": msg.get("admin_name", "Admin"),
                        "timestamp": msg.get("timestamp", ""),
                    })
                
                # Handle voice replies
                elif msg_type == "voice":
                    await manager.reply_to_customer(session_id, {
                        "type": "admin_reply",
                        "message_type": "voice",
                        "voice_url": msg.get("voice_url"),
                        "voice_duration": msg.get("voice_duration"),
                        "admin_name": msg.get("admin_name", "Admin"),
                        "timestamp": msg.get("timestamp", ""),
                    })
                
                # Handle message_edited, message_deleted, message_reaction
                elif msg_type in ["message_edited", "message_deleted", "message_reaction"]:
                    await manager.reply_to_customer(session_id, {
                        "type": msg_type,
                        "message_id": msg.get("message_id"),
                        "session_id": session_id,
                        "new_message": msg.get("new_message"),
                        "reaction": msg.get("reaction"),
                        "reacted_by": "Admin"
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