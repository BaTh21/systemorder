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
    """Customer WebSocket"""
    
    await websocket.accept()
    
    try:
        payload = decode_token(token)
        user_id = str(payload.get("sub"))
    except:
        user_id = f"guest_{id(websocket)}"
    
    session_id = user_id
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # 🔴 Handle connect message (sets session_id)
            if msg.get("type") == "connect":
                session_id = msg.get("session_id", user_id)
                manager.customer_connections[session_id] = websocket
                print(f"✅ Customer registered: user={user_id}, session={session_id}")
                continue  # Don't forward connect messages
            
            # 🔴 Handle chat messages - forward to admins
            if not session_id:
                session_id = msg.get("session_id", user_id)
                manager.customer_connections[session_id] = websocket
            
            await manager.notify_admins({
                "type": "customer_message",
                "from_user_id": user_id,
                "session_id": session_id,
                "sender_name": msg.get("sender_name", "Customer"),
                "message": msg.get("message", ""),
                "timestamp": msg.get("timestamp", ""),
            })
            print(f"📤 Customer message forwarded to admins: {msg.get('message','')[:30]}...")
            
    except WebSocketDisconnect:
        print(f"🔌 Customer disconnected: {user_id}")
        if session_id in manager.customer_connections:
            del manager.customer_connections[session_id]
    except Exception as e:
        print(f"❌ Customer WS error: {e}")
        if session_id in manager.customer_connections:
            del manager.customer_connections[session_id]


@router.websocket("/ws/admin/{token}")
async def ws_admin(websocket: WebSocket, token: str):
    """Admin WebSocket"""
    
    await websocket.accept()
    
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except:
        await websocket.close(code=4001)
        return
    
    async with async_session() as db:
        user = await db.get(User, user_id)
        if not user or user.role.value != "admin":
            await websocket.close(code=4003)
            return
    
    manager.admin_connections.append(websocket)
    print(f"✅ Admin connected (total: {len(manager.admin_connections)})")
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # Admin sends reply to session_id
            session_id = msg.get("session_id")
            if session_id:
                success = await manager.reply_to_customer(session_id, {
                    "type": "admin_reply",
                    "message": msg.get("message", ""),
                    "admin_name": msg.get("admin_name", "Admin"),
                    "timestamp": msg.get("timestamp", ""),
                })
                print(f"📤 Admin reply to {session_id}: {'✅ sent' if success else '❌ not connected'}")
                
    except WebSocketDisconnect:
        print("🔌 Admin disconnected")
        if websocket in manager.admin_connections:
            manager.admin_connections.remove(websocket)
    except Exception as e:
        print(f"❌ Admin WS error: {e}")
        if websocket in manager.admin_connections:
            manager.admin_connections.remove(websocket)