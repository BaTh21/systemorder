from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Query,
    WebSocketException
)

from jose import JWTError
from datetime import datetime
import json
from urllib.parse import unquote

from app.core.security import decode_token
from app.core.database import async_session
from app.models.user import User
from app.services.websocket_manager import manager


router = APIRouter()



async def authenticate_websocket(
    token: str
):

    if not token:
        raise WebSocketException(
            code=4001,
            reason="No token provided"
        )


    try:

        token = unquote(token).strip()


        payload = decode_token(token)


        user_id = payload.get("sub")


        if not user_id:
            raise WebSocketException(
                code=4002,
                reason="Invalid token"
            )


        async with async_session() as db:

            user = await db.get(
                User,
                int(user_id)
            )


            if not user:
                raise WebSocketException(
                    code=4003,
                    reason="User not found"
                )


            if not user.is_active:
                raise WebSocketException(
                    code=4004,
                    reason="Inactive user"
                )


            return user


    except JWTError as e:

        print("JWT ERROR:", e)

        raise WebSocketException(
            code=4005,
            reason=f"Token error: {str(e)}"
        )



@router.websocket("/ws/global")
async def websocket_global(
    websocket: WebSocket,
    token: str = Query(None)
):

    print("\nWebSocket connection")

    try:

        user = await authenticate_websocket(
            token
        )


        await manager.connect(
            websocket,
            str(user.id)
        )


        await websocket.send_json(
            {
                "type": "connection_established",
                "message": f"Welcome {user.full_name}",
                "user_id": str(user.id),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


        while True:

            data = await websocket.receive_text()

            message = json.loads(data)


            if message.get("type") == "ping":

                await websocket.send_json(
                    {
                        "type": "pong"
                    }
                )


    except WebSocketDisconnect:

        manager.disconnect(
            websocket
        )


    except WebSocketException as e:

        print(
            "AUTH FAILED:",
            e.reason
        )

        await websocket.close(
            code=e.code,
            reason=e.reason
        )