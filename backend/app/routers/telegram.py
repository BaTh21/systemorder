# app/routers/telegram.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.core.config import settings
import httpx

router = APIRouter(prefix="/telegram", tags=["telegram"])

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

async def send_telegram_message(chat_id: str, text: str, parse_mode: str = "HTML"):
    """Send message to Telegram chat"""
    url = f"{TELEGRAM_API}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=10)
            result = response.json()
            if not result.get("ok"):
                print(f"Telegram API error: {result}")
            return result
        except Exception as e:
            print(f"Error sending Telegram message: {e}")
            return {"ok": False}

async def send_telegram_photo(chat_id: str, photo_path: str, caption: str = ""):
    """Send photo/QR code to Telegram"""
    url = f"{TELEGRAM_API}/sendPhoto"
    
    print(f"\n📸 Sending photo to {chat_id}")
    print(f"   File: {photo_path}")
    print(f"   Exists: {Path(photo_path).exists()}")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            with open(photo_path, 'rb') as photo_file:
                files = {'photo': (Path(photo_path).name, photo_file, 'image/png')}
                data = {
                    'chat_id': chat_id,
                    'caption': caption,
                    'parse_mode': 'HTML'
                }
                response = await client.post(url, files=files, data=data)
                result = response.json()
                print(f"   Result: {result}")
                return result
    except FileNotFoundError:
        print(f"   ❌ File not found: {photo_path}")
        return {"ok": False, "error": "File not found"}
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return {"ok": False, "error": str(e)}

@router.post("/connect")
async def connect_telegram(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect user's Telegram account"""
    chat_id = data.get("chat_id")
    if not chat_id:
        raise HTTPException(400, "chat_id is required")
    
    user = await db.get(User, current_user.id)
    user.telegram_chat_id = str(chat_id)
    await db.commit()
    
    # Send welcome message with payment info command
    await send_telegram_message(
        chat_id=chat_id,
        text=f"✅ <b>Connected to TeleShop!</b>\n\n"
             f"Welcome <b>{user.full_name}</b>!\n\n"
             f"You will now receive:\n"
             f"📦 Order confirmations\n"
             f"💰 Payment requests with bank details\n"
             f"🚚 Shipping updates with tracking\n"
             f"📬 Delivery notifications\n\n"
             f"<b>Commands:</b>\n"
             f"/orders - View your orders\n"
             f"/payment - Payment information\n"
             f"/status - Order status guide\n"
             f"/help - Get help"
    )
    
    return {"message": "Telegram connected successfully"}

@router.post("/disconnect")
async def disconnect_telegram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect user's Telegram account"""
    user = await db.get(User, current_user.id)
    
    if user.telegram_chat_id:
        await send_telegram_message(
            chat_id=user.telegram_chat_id,
            text="You have been disconnected from TeleShop notifications.\n\nSend /start to reconnect anytime."
        )
    
    user.telegram_chat_id = None
    await db.commit()
    
    return {"message": "Telegram disconnected"}

@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle incoming Telegram messages"""
    data = await request.json()
    
    if "message" in data:
        message = data["message"]
        chat_id = str(message["chat"]["id"])
        text = message.get("text", "")
        user_first_name = message["from"].get("first_name", "User")
        
        if text == "/start":
            welcome_text = f"""
👋 <b>Welcome to TeleShop Bot, {user_first_name}!</b>

I'll keep you updated on your orders and payments.

<b>📋 Commands:</b>
/orders - View your recent orders
/payment - Payment information & bank details
/status - Check order status guide
/connect - Connect your account
/help - Get help
/support - Contact support

<b>To connect your account:</b>
1. Log in to TeleShop website
2. Go to Profile Settings
3. Click "Connect Telegram"
4. Enter this Chat ID: <code>{chat_id}</code>

Happy shopping! 🛍️
"""
            await send_telegram_message(chat_id, welcome_text)
        
        elif text == "/orders":
            # Find user by telegram_chat_id
            result = await db.execute(
                select(User).where(User.telegram_chat_id == chat_id)
            )
            user = result.scalars().first()
            
            if user:
                # Fetch recent orders
                result = await db.execute(
                    select(Order)
                    .where(Order.user_id == user.id)
                    .order_by(Order.created_at.desc())
                    .limit(5)
                )
                orders = result.scalars().all()
                
                if orders:
                    orders_text = "<b>📋 Your Recent Orders:</b>\n\n"
                    for order in orders:
                        status_emoji = {
                            "pending": "⏳",
                            "confirmed": "✅",
                            "waiting_payment": "💰",
                            "paid": "💳",
                            "purchasing": "🛒",
                            "shipping": "🚚",
                            "completed": "📦",
                            "cancelled": "❌"
                        }.get(order.status.value if hasattr(order.status, 'value') else str(order.status), "📋")
                        
                        orders_text += (
                            f"{status_emoji} <b>#{order.id}</b>\n"
                            f"   Status: {order.status}\n"
                            f"   Total: ${order.total}\n"
                            f"   Date: {order.created_at.strftime('%Y-%m-%d')}\n\n"
                        )
                    
                    orders_text += "<i>Use /payment for bank details to complete your payment.</i>"
                    await send_telegram_message(chat_id, orders_text)
                else:
                    await send_telegram_message(chat_id, "You have no orders yet.\nStart shopping at TeleShop! 🛍️")
            else:
                await send_telegram_message(
                    chat_id,
                    f"Your Telegram is not connected to a TeleShop account.\n\n"
                    f"Your Chat ID: <code>{chat_id}</code>\n\n"
                    f"Use /connect for instructions."
                )
        
        elif text == "/payment":
            # Send payment information with bank details
            payment_text = f"""
<b>💰 Payment Information</b>

Please transfer to:

🏦 <b>Bank:</b> {getattr(settings, 'BANK_NAME', 'ABA Bank')}
👤 <b>Account Name:</b> {getattr(settings, 'BANK_ACCOUNT_NAME', 'TeleShop Inc.')}
🔢 <b>Account Number:</b> <code>{getattr(settings, 'BANK_ACCOUNT_NUMBER', '000123456789')}</code>

<b>Additional Info:</b>
• SWIFT: {getattr(settings, 'BANK_SWIFT_CODE', 'N/A')}
• Routing: {getattr(settings, 'BANK_ROUTING_NUMBER', 'N/A')}

<b>📱 Steps to Complete Payment:</b>
1. Transfer the exact order amount
2. Take a screenshot of confirmation
3. Upload on website: Orders → View Details
4. Payment verified within 1-2 hours

<b>⚠️ Important:</b>
• Use your Order ID as reference
• Send exact amount shown in order
• Keep payment receipt until confirmed

Use /orders to see your pending payments.
"""
            await send_telegram_message(chat_id, payment_text)
            
            # Try to send QR code if available
            qr_path = Path("uploads/payments/qr-code.png")
            if qr_path.exists():
                await send_telegram_photo(
                    chat_id, 
                    str(qr_path),
                    "📱 <b>Scan QR Code to Pay</b>\n\nScan this QR code with your banking app to pay quickly."
                )
        
        elif text == "/connect":
            await send_telegram_message(
                chat_id,
                f"<b>🔗 Connect Your Account</b>\n\n"
                f"1. Log in to TeleShop website\n"
                f"2. Go to <b>Profile Settings</b>\n"
                f"3. Click <b>Connect Telegram</b>\n"
                f"4. Enter this Chat ID: <code>{chat_id}</code>\n\n"
                f"<b>Quick Links:</b>\n"
                f"/start - Main menu\n"
                f"/payment - Payment info\n"
                f"/orders - Your orders"
            )
        
        elif text == "/help":
            await send_telegram_message(
                chat_id,
                "<b>❓ TeleShop Bot Help</b>\n\n"
                "<b>Available Commands:</b>\n"
                "/start - Start the bot & see welcome message\n"
                "/orders - View your recent orders\n"
                "/payment - Get bank details & QR code for payment\n"
                "/status - Order status guide\n"
                "/connect - Connect your TeleShop account\n"
                "/support - Contact customer support\n"
                "/help - Show this help message\n\n"
                "<b>Need Help?</b>\n"
                "Contact us: @TeleShopSupport\n"
                "Website: http://localhost:8000"
            )
        
        elif text == "/status":
            await send_telegram_message(
                chat_id,
                "<b>📊 Order Status Guide:</b>\n\n"
                "⏳ <b>Pending</b> - Order received, awaiting review\n"
                "✅ <b>Confirmed</b> - Order confirmed by admin\n"
                "💰 <b>Waiting Payment</b> - Please complete payment\n"
                "💳 <b>Paid</b> - Payment received, processing\n"
                "🛒 <b>Purchasing</b> - Buying items from suppliers\n"
                "🚚 <b>Shipping</b> - Package on the way\n"
                "📦 <b>Completed</b> - Successfully delivered\n"
                "❌ <b>Cancelled</b> - Order cancelled\n\n"
                "Use /orders to see your orders.\n"
                "Use /payment for payment details."
            )
        
        elif text == "/support":
            await send_telegram_message(
                chat_id,
                "<b>💬 TeleShop Support</b>\n\n"
                "<b>Contact Options:</b>\n"
                "📱 Telegram: @TeleShopSupport\n"
                "📧 Email: support@teleshop.com\n"
                "📞 Phone: +855 12 345 678\n\n"
                "<b>Working Hours:</b>\n"
                "Monday - Friday: 8 AM - 9 PM\n"
                "Saturday: 9 AM - 6 PM\n"
                "Sunday: Closed\n\n"
                "We usually respond within 1-2 hours."
            )
            
        elif text == "/payment":
            # Send payment information
            payment_text = f"""
        <b>💰 Payment Information</b>

        Please transfer to:

        🏦 <b>Bank:</b> ABA Bank
        👤 <b>Account Name:</b> TeleShop Inc.
        🔢 <b>Account Number:</b> <code>000123456789</code>

        <b>Steps:</b>
        1. Transfer exact order amount
        2. Take screenshot of confirmation
        3. Upload on website

        Use /orders to see your pending payments.
        """
            await send_telegram_message(chat_id, payment_text)
            
            # Send QR code if exists
            qr_path = Path("uploads/payments/qr-code.png")
            print(f"QR Code path: {qr_path}")
            print(f"QR Code exists: {qr_path.exists()}")
            
            if qr_path.exists():
                print("📱 Sending QR code...")
                result = await send_telegram_photo(
                    chat_id,
                    str(qr_path),
                    "📱 <b>Scan QR Code to Pay</b>"
                )
                print(f"QR send result: {result}")
            else:
                print("❌ QR code file not found!")
                await send_telegram_message(
                    chat_id,
                    "⚠️ QR code not available. Please use the bank details above."
                )
    
    return {"ok": True}