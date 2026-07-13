# Add this to app/routers/telegram.py
from select import select

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.core.config import settings
import httpx
from fastapi import Request

router = APIRouter(prefix="/telegram", tags=["telegram"])

@router.post("/connect")
async def connect_telegram(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect user's Telegram account"""
    user = await db.get(User, current_user.id)
    user.telegram_chat_id = chat_id
    await db.commit()
    
    # Send confirmation message to user
    await send_telegram_message(
        chat_id=chat_id,
        text="✅ Your Telegram account has been connected to TeleShop!\n\n"
             "You will receive order updates here."
    )
    
    return {"message": "Telegram connected successfully"}

@router.post("/disconnect")
async def disconnect_telegram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect user's Telegram account"""
    user = await db.get(User, current_user.id)
    user.telegram_chat_id = None
    await db.commit()
    return {"message": "Telegram disconnected"}

async def send_telegram_message(chat_id: str, text: str, parse_mode: str = "HTML"):
    """Send message to a specific Telegram chat"""
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        return response.json()

async def send_order_status_update(order, new_status: str):
    """Send order status update to customer via Telegram"""
    if order.user.telegram_chat_id:
        status_messages = {
            "confirmed": "✅ Your order has been confirmed!",
            "waiting_payment": "💰 Please complete the payment for your order.",
            "paid": "💳 Payment received! We're processing your order.",
            "purchasing": "🛒 We're purchasing your items.",
            "shipping": "🚚 Your order is on the way!",
            "completed": "📦 Order delivered! Thank you for shopping with us.",
            "cancelled": "❌ Your order has been cancelled."
        }
        
        message = f"<b>Order Update #{order.id[:8]}</b>\n\n"
        message += status_messages.get(new_status, f"Status: {new_status}")
        
        if new_status == "shipping" and order.tracking_number:
            message += f"\n\nTracking Number: <code>{order.tracking_number}</code>"
        
        await send_telegram_message(
            chat_id=order.user.telegram_chat_id,
            text=message
        )
    
@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle incoming Telegram messages"""
    data = await request.json()
    
    if "message" in data:
        message = data["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        
        if text == "/start":
            # Send welcome message
            welcome_text = (
                "Welcome to TeleShop Bot! 🛍️\n\n"
                "Commands:\n"
                "/connect - Connect your account\n"
                "/orders - View your orders\n"
                "/help - Show help"
            )
            await send_telegram_message(chat_id, welcome_text)
        
        elif text == "/connect":
            # Provide connection instructions
            connect_text = (
                "To connect your TeleShop account:\n\n"
                "1. Log in to your TeleShop account\n"
                "2. Go to Settings > Telegram\n"
                "3. Enter this Chat ID: <code>{}</code>\n\n"
                "Or click the button below to connect now!"
            ).format(chat_id)
            await send_telegram_message(chat_id, connect_text)
        
        elif text == "/orders":
            # Check if user is connected
            from app.models.user import User
            result = await db.execute(
                select(User).where(User.telegram_chat_id == str(chat_id))
            )
            user = result.scalars().first()
            
            if user:
                # Fetch recent orders
                from app.models.order import Order
                result = await db.execute(
                    select(Order)
                    .where(Order.user_id == user.id)
                    .order_by(Order.created_at.desc())
                    .limit(5)
                )
                orders = result.scalars().all()
                
                if orders:
                    orders_text = "<b>Your Recent Orders:</b>\n\n"
                    for order in orders:
                        status_emoji = {
                            "pending": "⏳",
                            "confirmed": "✅",
                            "shipping": "🚚",
                            "completed": "📦",
                            "cancelled": "❌"
                        }.get(order.status, "📋")
                        
                        orders_text += (
                            f"{status_emoji} <b>#{order.id[:8]}</b>\n"
                            f"   Status: {order.status}\n"
                            f"   Total: ${order.total}\n"
                            f"   Date: {order.created_at.strftime('%Y-%m-%d')}\n\n"
                        )
                    await send_telegram_message(chat_id, orders_text)
                else:
                    await send_telegram_message(chat_id, "You have no orders yet.")
            else:
                await send_telegram_message(
                    chat_id,
                    "Your Telegram account is not connected to TeleShop.\n"
                    "Use /connect to link your account."
                )
        
        elif text == "/help":
            help_text = (
                "<b>TeleShop Bot Help</b>\n\n"
                "Commands:\n"
                "/start - Start the bot\n"
                "/connect - Connect your TeleShop account\n"
                "/orders - View your recent orders\n"
                "/help - Show this help message\n\n"
                "For support, contact @TeleShopSupport"
            )
            await send_telegram_message(chat_id, help_text)
    
    return {"ok": True}