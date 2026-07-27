# app/services/notification_service.py
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session
from app.models.user import User, UserNotification, NotificationType, UserStatus
from app.services.telegram import send_telegram_message
from app.core.config import settings
import json


class NotificationService:
    """Service for sending notifications via Telegram and In-App"""
    
    @staticmethod
    async def send_user_notification(
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        send_telegram: bool = True,
        db: AsyncSession = None
    ) -> Dict[str, bool]:
        """
        Send notification to user via Telegram and In-App
        """
        results = {
            "in_app": False,
            "telegram": False
        }
        
        # Get user
        if db is None:
            async with async_session() as session:
                user = await session.get(User, user_id)
        else:
            user = await db.get(User, user_id)
        
        if not user:
            print(f"❌ User {user_id} not found")
            return results
        
        # 1. Save In-App Notification
        if settings.NOTIFICATION_IN_APP_ENABLED:
            try:
                if db is None:
                    async with async_session() as session:
                        notification = UserNotification(
                            user_id=user_id,
                            type=notification_type,
                            title=title,
                            message=message,
                            data=data,
                            is_read=False
                        )
                        session.add(notification)
                        await session.commit()
                        results["in_app"] = True
                        print(f"✅ In-app notification saved for user {user_id}")
                else:
                    notification = UserNotification(
                        user_id=user_id,
                        type=notification_type,
                        title=title,
                        message=message,
                        data=data,
                        is_read=False
                    )
                    db.add(notification)
                    await db.commit()
                    results["in_app"] = True
            except Exception as e:
                print(f"❌ Failed to save in-app notification: {e}")
        
        # 2. Send Telegram Notification
        if send_telegram and settings.NOTIFICATION_TELEGRAM_ENABLED:
            if user.telegram_chat_id:
                try:
                    # Format message for Telegram
                    telegram_message = NotificationService._format_telegram_message(
                        notification_type,
                        title,
                        message,
                        data
                    )
                    await send_telegram_message(
                        user.telegram_chat_id,
                        telegram_message
                    )
                    results["telegram"] = True
                    print(f"✅ Telegram notification sent to user {user_id}")
                except Exception as e:
                    print(f"❌ Failed to send Telegram notification: {e}")
            else:
                print(f"ℹ️ User {user_id} has no Telegram chat ID")
        
        return results
    
    @staticmethod
    def _format_telegram_message(
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """Format notification for Telegram with emojis"""
        
        emoji_map = {
            NotificationType.account_approved: "✅",
            NotificationType.account_rejected: "❌",
            NotificationType.order_created: "🛒",
            NotificationType.order_updated: "📋",
            NotificationType.payment_received: "💳",
            NotificationType.shipping_update: "🚚",
            NotificationType.order_completed: "📦",
            NotificationType.promotion: "🎉"
        }
        
        emoji = emoji_map.get(notification_type, "📢")
        
        formatted = f"{emoji} <b>{title}</b>\n\n"
        formatted += message
        
        # Add extra data if present
        if data:
            formatted += "\n\n━━━━━━━━━━━━━━━━━━━"
            if "order_id" in data:
                formatted += f"\n🆔 <b>Order ID:</b> #{data['order_id']}"
            if "tracking_number" in data:
                formatted += f"\n📦 <b>Tracking:</b> {data['tracking_number']}"
            if "amount" in data:
                formatted += f"\n💰 <b>Amount:</b> ${data['amount']}"
            if "status" in data:
                formatted += f"\n📊 <b>Status:</b> {data['status']}"
        
        return formatted
    
    @staticmethod
    async def get_user_notifications(
        user_id: int,
        limit: int = 50,
        unread_only: bool = False,
        db: AsyncSession = None
    ) -> list:
        """Get user's notifications"""
        
        if db is None:
            async with async_session() as session:
                return await NotificationService._get_notifications(
                    session, user_id, limit, unread_only
                )
        else:
            return await NotificationService._get_notifications(
                db, user_id, limit, unread_only
            )
    
    @staticmethod
    async def _get_notifications(
        db: AsyncSession,
        user_id: int,
        limit: int,
        unread_only: bool
    ) -> list:
        """Internal method to get notifications"""
        
        query = select(UserNotification).where(
            UserNotification.user_id == user_id
        )
        
        if unread_only:
            query = query.where(UserNotification.is_read == False)
        
        query = query.order_by(UserNotification.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        return [
            {
                "id": n.id,
                "type": n.type.value,
                "title": n.title,
                "message": n.message,
                "data": n.data,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "read_at": n.read_at.isoformat() if n.read_at else None
            }
            for n in notifications
        ]
    
    @staticmethod
    async def mark_notification_as_read(
        notification_id: int,
        user_id: int,
        db: AsyncSession = None
    ) -> bool:
        """Mark a notification as read"""
        
        if db is None:
            async with async_session() as session:
                return await NotificationService._mark_read(
                    session, notification_id, user_id
                )
        else:
            return await NotificationService._mark_read(
                db, notification_id, user_id
            )
    
    @staticmethod
    async def _mark_read(
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Internal method to mark as read"""
        
        notification = await db.get(UserNotification, notification_id)
        
        if not notification or notification.user_id != user_id:
            return False
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await db.commit()
        
        return True
    
    @staticmethod
    async def mark_all_as_read(
        user_id: int,
        db: AsyncSession = None
    ) -> int:
        """Mark all notifications as read"""
        
        if db is None:
            async with async_session() as session:
                return await NotificationService._mark_all_read(
                    session, user_id
                )
        else:
            return await NotificationService._mark_all_read(
                db, user_id
            )
    
    @staticmethod
    async def _mark_all_read(
        db: AsyncSession,
        user_id: int
    ) -> int:
        """Internal method to mark all as read"""
        
        result = await db.execute(
            select(UserNotification).where(
                UserNotification.user_id == user_id,
                UserNotification.is_read == False
            )
        )
        notifications = result.scalars().all()
        
        count = len(notifications)
        for n in notifications:
            n.is_read = True
            n.read_at = datetime.utcnow()
        
        await db.commit()
        return count
    
    @staticmethod
    async def delete_notification(
        notification_id: int,
        user_id: int,
        db: AsyncSession = None
    ) -> bool:
        """Delete a notification"""
        
        if db is None:
            async with async_session() as session:
                return await NotificationService._delete_notification(
                    session, notification_id, user_id
                )
        else:
            return await NotificationService._delete_notification(
                db, notification_id, user_id
            )
    
    @staticmethod
    async def _delete_notification(
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Internal method to delete notification"""
        
        notification = await db.get(UserNotification, notification_id)
        
        if not notification or notification.user_id != user_id:
            return False
        
        await db.delete(notification)
        await db.commit()
        
        return True


# ✅ Convenience functions for specific notification types
async def send_account_approved_notification(user_id: int, full_name: str):
    """Send account approved notification"""
    
    title = "Account Approved! 🎉"
    message = f"""Dear {full_name},

Your TeleShop account has been approved by the admin.

You can now:
• Login to your account
• Browse products and place orders
• Track your deliveries
• Get real-time updates

Welcome to TeleShop! 🛍️"""
    
    data = {
        "user_id": user_id,
        "full_name": full_name,
        "action": "login"
    }
    
    return await NotificationService.send_user_notification(
        user_id=user_id,
        notification_type=NotificationType.account_approved,
        title=title,
        message=message,
        data=data,
        send_telegram=True
    )


async def send_account_rejected_notification(
    user_id: int, 
    full_name: str, 
    rejection_reason: str
):
    """Send account rejected notification"""
    
    title = "Account Not Approved ❌"
    message = f"""Dear {full_name},

We regret to inform you that your registration request was not approved.

Reason: {rejection_reason}

If you believe this is a mistake, please contact support:
📧 support@teleshop.com
📱 Telegram: @TeleShopSupport"""
    
    data = {
        "user_id": user_id,
        "full_name": full_name,
        "rejection_reason": rejection_reason
    }
    
    return await NotificationService.send_user_notification(
        user_id=user_id,
        notification_type=NotificationType.account_rejected,
        title=title,
        message=message,
        data=data,
        send_telegram=True
    )


async def send_order_created_notification(user_id: int, order_id: int, total: float):
    """Send order created notification"""
    
    title = "Order Created 🛒"
    message = f"""Your order #{order_id} has been created successfully.

Total: ${total:.2f}

We will notify you once the order is confirmed."""
    
    data = {
        "order_id": order_id,
        "total": total,
        "status": "pending"
    }
    
    return await NotificationService.send_user_notification(
        user_id=user_id,
        notification_type=NotificationType.order_created,
        title=title,
        message=message,
        data=data,
        send_telegram=True
    )


async def send_order_status_notification(
    user_id: int, 
    order_id: int, 
    status: str, 
    tracking_number: str = None
):
    """Send order status update notification"""
    
    status_messages = {
        "confirmed": "✅ Your order has been confirmed!",
        "waiting_payment": "💰 Please complete payment for your order.",
        "paid": "💳 Payment received! Processing your order.",
        "purchasing": "🛒 Purchasing your items from suppliers.",
        "shipping": "🚚 Your order is on the way!",
        "completed": "📦 Order delivered! Thank you!",
        "cancelled": "❌ Order cancelled."
    }
    
    title = f"Order Update #{order_id} 📋"
    message = status_messages.get(status, f"Order status updated to: {status}")
    
    data = {
        "order_id": order_id,
        "status": status,
        "tracking_number": tracking_number
    }
    
    if tracking_number:
        message += f"\n\n📦 Tracking: {tracking_number}"
    
    return await NotificationService.send_user_notification(
        user_id=user_id,
        notification_type=NotificationType.order_updated,
        title=title,
        message=message,
        data=data,
        send_telegram=True
    )