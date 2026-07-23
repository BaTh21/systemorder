# app/services/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.customer_connections: Dict[str, WebSocket] = {}
        self.admin_connections: List[WebSocket] = []
    
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
    
    async def reply_to_customer(self, session_id: str, message: dict):
        """Send reply to specific customer"""
        if session_id in self.customer_connections:
            try:
                await self.customer_connections[session_id].send_text(json.dumps(message))
                return True
            except Exception:
                del self.customer_connections[session_id]
        return False

manager = ConnectionManager()