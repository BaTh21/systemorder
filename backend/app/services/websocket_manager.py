# app/services/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.customer_connections: Dict[str, WebSocket] = {}
        self.admin_connections: List[WebSocket] = []
    
    async def notify_admins(self, message: dict):
        for ws in self.admin_connections[:]:
            try: await ws.send_text(json.dumps(message))
            except: self.admin_connections.remove(ws)
    
    async def reply_to_customer(self, session_id: str, message: dict):
        if session_id in self.customer_connections:
            try:
                await self.customer_connections[session_id].send_text(json.dumps(message))
                return True
            except: del self.customer_connections[session_id]
        return False

manager = ConnectionManager()