# app/routers/chat_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager
from app.core.security import decode_token
from app.core.database import async_session
from app.models.user import User
import json

router = APIRouter()

@router.websocket("/ws/customer/{token}")
async def ws_customer(websocket: WebSocket, token: str):
    await websocket.accept()
    try: payload = decode_token(token); user_id = str(payload.get("sub"))
    except: user_id = f"guest_{id(websocket)}"
    
    session_id = user_id
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "connect":
                session_id = msg.get("session_id", user_id)
                manager.customer_connections[session_id] = websocket
                continue
            
            msg_session = msg.get("session_id", session_id)
            if msg_session not in manager.customer_connections:
                manager.customer_connections[msg_session] = websocket
            
            await manager.notify_admins({
                "type": "customer_message",
                "from_user_id": user_id,
                "session_id": msg_session,
                "sender_name": msg.get("sender_name", "Customer"),
                "message": msg.get("message", ""),
                "message_type": msg.get("type", "text"),
                "image_url": msg.get("image_url"),
                "file_data": msg.get("file_data"),
                "voice_url": msg.get("voice_url"),
                "voice_duration": msg.get("voice_duration"),
                "timestamp": msg.get("timestamp", ""),
            })
    except WebSocketDisconnect:
        for sid, ws in list(manager.customer_connections.items()):
            if ws == websocket: del manager.customer_connections[sid]


@router.websocket("/ws/admin/{token}")
async def ws_admin(websocket: WebSocket, token: str):
    await websocket.accept()
    try: payload = decode_token(token); user_id = int(payload.get("sub"))
    except: await websocket.close(code=4001); return
    
    async with async_session() as db:
        user = await db.get(User, user_id)
        if not user or user.role.value != "admin": await websocket.close(code=4003); return
    
    manager.admin_connections.append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            session_id = msg.get("session_id")
            if session_id:
                await manager.reply_to_customer(session_id, {
                    "type": "admin_reply",
                    "message": msg.get("message", ""),
                    "message_type": msg.get("type", "text"),
                    "image_url": msg.get("image_url"),
                    "file_data": msg.get("file_data"),
                    "voice_url": msg.get("voice_url"),
                    "voice_duration": msg.get("voice_duration"),
                    "admin_name": msg.get("admin_name", "Admin"),
                    "timestamp": msg.get("timestamp", ""),
                })
    except WebSocketDisconnect:
        if websocket in manager.admin_connections: manager.admin_connections.remove(websocket)