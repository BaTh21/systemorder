# app/services/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.customer_connections: Dict[str, WebSocket] = {}
        self.admin_connections: List[WebSocket] = []
        # ✅ Track admin WebSocket connections by token for direct messaging
        self.admin_ws_map: Dict[str, WebSocket] = {}
        self.typing_status: Dict[str, bool] = {}
    
    async def connect_admin(self, websocket: WebSocket, token: str):
        """Register admin connection"""
        await websocket.accept()
        self.admin_connections.append(websocket)
        self.admin_ws_map[token] = websocket
        print(f"✅ Admin connected. Total admins: {len(self.admin_connections)}")
    
    def disconnect_admin(self, websocket: WebSocket, token: str = None):
        """Remove admin connection"""
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)
        if token and token in self.admin_ws_map:
            del self.admin_ws_map[token]
        print(f"❌ Admin disconnected. Total admins: {len(self.admin_connections)}")
    
    async def connect_customer(self, websocket: WebSocket, session_id: str):
        """Register customer connection"""
        await websocket.accept()
        self.customer_connections[session_id] = websocket
        print(f"✅ Customer connected: {session_id}")
    
    def disconnect_customer(self, session_id: str):
        """Remove customer connection"""
        if session_id in self.customer_connections:
            del self.customer_connections[session_id]
            print(f"❌ Customer disconnected: {session_id}")
    
    async def notify_admins(self, message: dict):
        """Send message to all connected admins"""
        disconnected = []
        for ws in self.admin_connections[:]:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                disconnected.append(ws)
        
        for ws in disconnected:
            if ws in self.admin_connections:
                self.admin_connections.remove(ws)
    
    async def send_to_admin(self, websocket: WebSocket, message: dict):
        """Send message to a specific admin WebSocket"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"❌ Failed to send to admin: {e}")
    
    async def reply_to_customer(self, session_id: str, message: dict):
        """Send reply to specific customer with real-time notification"""
        if session_id in self.customer_connections:
            try:
                message["is_admin_reply"] = True
                await self.customer_connections[session_id].send_text(json.dumps(message))
                return True
            except Exception:
                del self.customer_connections[session_id]
        return False
    async def send_typing_indicator(self, session_id: str, is_typing: bool, sender: str):
        """Send typing indicator to the other party"""
        # Store typing status
        self.typing_status[session_id] = is_typing
        
        # Determine who to send to
        if sender == "customer":
            # Send to all admins
            await self.notify_admins({
                "type": "typing",
                "session_id": session_id,
                "is_typing": is_typing,
                "sender": "customer",
                "sender_name": "Customer"
            })
        elif sender == "admin":
            # Send to specific customer
            await self.reply_to_customer(session_id, {
                "type": "typing",
                "session_id": session_id,
                "is_typing": is_typing,
                "sender": "admin",
                "sender_name": "Admin"
            })
    def get_typing_status(self, session_id: str) -> bool:
        """Get typing status for a session"""
        return self.typing_status.get(session_id, False)
manager = ConnectionManager()