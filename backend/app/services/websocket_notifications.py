# app/services/websocket_notifications.py
from app.services.websocket_manager import manager
from datetime import datetime
from typing import Optional
import json

async def notify_order_status_update(user_id: str, order_id: str, status: str, tracking_number: Optional[str] = None):
    """Send order status update via WebSocket"""
    message = {
        "type": "order_update",
        "order_id": order_id,
        "status": status,
        "tracking_number": tracking_number,
        "timestamp": str(datetime.utcnow())
    }
    
    sent = await manager.send_personal_message(message, user_id)
    
    # If user is not online, you could store the notification for later
    if not sent:
        print(f"User {user_id} is offline. Notification queued.")
        # TODO: Store notification in database for later delivery
    
    return sent

async def notify_new_order(order_id: str, order_data: dict):
    """Notify admins about new order"""
    message = {
        "type": "new_order",
        "order_id": order_id,
        "customer_name": order_data.get("customer_name"),
        "total": order_data.get("total"),
        "timestamp": str(datetime.utcnow())
    }
    
    await manager.broadcast(message)

async def notify_payment_received(user_id: str, order_id: str):
    """Notify user that payment was received"""
    message = {
        "type": "payment_received",
        "order_id": order_id,
        "message": "Your payment has been received!",
        "timestamp": str(datetime.utcnow())
    }
    
    await manager.send_personal_message(message, user_id)

async def send_system_notification(message: str, user_id: Optional[str] = None):
    """Send system notification"""
    notification = {
        "type": "system_notification",
        "message": message,
        "timestamp": str(datetime.utcnow())
    }
    
    if user_id:
        await manager.send_personal_message(notification, user_id)
    else:
        await manager.broadcast(notification)