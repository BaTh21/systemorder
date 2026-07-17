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
    request: Request,  # Use Request to get JSON body
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect user's Telegram account"""
    try:
        data = await request.json()
    except:
        raise HTTPException(400, "Invalid request body")
    
    chat_id = data.get("chat_id")
    if not chat_id:
        raise HTTPException(400, "chat_id is required")
    
    user = await db.get(User, current_user.id)
    user.telegram_chat_id = str(chat_id)
    await db.commit()
    
    # Send welcome message
    try:
        await send_telegram_message(
            chat_id=chat_id,
            text=f"✅ <b>Connected to TeleShop!</b>\n\n"
                 f"Welcome <b>{user.full_name}</b>!\n\n"
                 f"You will now receive order updates via Telegram."
        )
    except Exception as e:
        print(f"⚠️ Could not send welcome message: {e}")
    
    return {"message": "Telegram connected successfully"}

@router.post("/disconnect")
async def disconnect_telegram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect user's Telegram account"""
    user = await db.get(User, current_user.id)
    
    if not user.telegram_chat_id:
        raise HTTPException(400, "Telegram is not connected")
    
    # Try to send goodbye message (don't fail if this fails)
    try:
        await send_telegram_message(
            chat_id=user.telegram_chat_id,
            text="You have been disconnected from TeleShop notifications.\n\nSend /start to reconnect anytime."
        )
    except Exception as e:
        print(f"⚠️ Could not send disconnect message: {e}")
    
    # Clear the telegram_chat_id
    user.telegram_chat_id = None
    await db.commit()
    
    return {"message": "Telegram disconnected successfully"}

@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle incoming Telegram messages"""
    try:
        data = await request.json()
        print(f"📩 Telegram webhook received: {data}")
        
        if "message" in data:
            message = data["message"]
            chat_id = str(message["chat"]["id"])
            text = message.get("text", "")
            user_first_name = message["from"].get("first_name", "User")
            
            print(f"   From: {user_first_name} (Chat ID: {chat_id})")
            print(f"   Text: {text}")
            
            if text == "/start":
                # Always reply with Chat ID
                reply_text = f"""
👋 <b>Welcome to TeleShop Bot, {user_first_name}!</b>

📱 <b>Your Chat ID:</b> <code>{chat_id}</code>

<b>🔗 How to connect:</b>
1. Copy your Chat ID above
2. Go to TeleShop website → Profile → Telegram
3. Paste this Chat ID and click Connect

<b>📋 Available Commands:</b>
/orders - View your recent orders
/payment - Payment & bank details
/status - Order status guide
/help - Get help
/chatid - Show your Chat ID again

<i>Save this Chat ID - you'll need it to connect!</i>
"""
                await send_telegram_message(chat_id, reply_text)
                print(f"   ✅ Sent welcome message with Chat ID")
            
            elif text == "/chatid":
                await send_telegram_message(
                    chat_id,
                    f"📱 <b>Your Chat ID:</b> <code>{chat_id}</code>\n\nUse this to connect your TeleShop account."
                )
            
            elif text == "/orders":
                result = await db.execute(
                    select(User).where(User.telegram_chat_id == chat_id)
                )
                user = result.scalars().first()
                
                if user:
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
                            emoji = {"pending":"⏳","confirmed":"✅","waiting_payment":"💰","paid":"💳","shipping":"🚚","completed":"📦","cancelled":"❌"}
                            status = order.status.value if hasattr(order.status, 'value') else str(order.status)
                            orders_text += f"{emoji.get(status,'📋')} <b>#{order.id}</b> - ${order.total}\n"
                        await send_telegram_message(chat_id, orders_text)
                    else:
                        await send_telegram_message(chat_id, "📭 No orders yet!")
                else:
                    await send_telegram_message(chat_id, "⚠️ Account not connected. Use /start to get your Chat ID.")
            
            elif text == "/payment":
                payment_text = f"""
💰 <b>Payment Information</b>

🏦 <b>Bank:</b> {settings.BANK_NAME}
👤 <b>Account:</b> {settings.BANK_ACCOUNT_NAME}
🔢 <b>Number:</b> <code>{settings.BANK_ACCOUNT_NUMBER}</code>

<b>Steps:</b>
1. Transfer exact amount
2. Upload screenshot on website
3. Order will be confirmed

/orders - View your orders
"""
                await send_telegram_message(chat_id, payment_text)
            
            elif text == "/help":
                help_text = """
❓ <b>TeleShop Bot Help</b>

/start - Welcome & Chat ID
/chatid - Show your Chat ID
/orders - Your recent orders
/payment - Payment info
/status - Order status guide
/help - This help message

📧 <b>Support:</b> support@teleshop.com
"""
                await send_telegram_message(chat_id, help_text)
            
            elif text == "/status":
                status_text = """
📊 <b>Order Status Guide:</b>

⏳ Pending - Order received
✅ Confirmed - Order approved
💰 Waiting Payment - Please pay
💳 Paid - Processing
🚚 Shipping - On the way
📦 Completed - Delivered
❌ Cancelled - Cancelled
"""
                await send_telegram_message(chat_id, status_text)
            
            else:
                await send_telegram_message(
                    chat_id,
                    f"Send /start to get your Chat ID and connect your account!\n\n/help - See all commands"
                )
        
        return {"ok": True}
        
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return {"ok": False, "error": str(e)}