from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_user_map: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.connection_user_map[websocket] = user_id
        print(f"Connected: {user_id}")
        print(f"Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        user_id = self.connection_user_map.pop(websocket, None)
        if user_id:
            self.active_connections.pop(user_id, None)
            print(f"Disconnected: {user_id}")
            print(f"Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, user_id: str):
        websocket = self.active_connections.get(user_id)

        if websocket is None:
            return False

        try:
            await websocket.send_json(message)
            return True
        except Exception as e:
            print(f"Send error: {e}")
            self.disconnect(websocket)
            return False

    async def broadcast(self, message: dict):
        disconnected = []

        for websocket in self.active_connections.values():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(websocket)

    def get_online_count(self):
        return len(self.active_connections)


manager = ConnectionManager()