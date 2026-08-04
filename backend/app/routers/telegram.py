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
from app.services.khqr_service import KHQRGenerator
import httpx
import secrets
import io
import base64
from datetime import datetime, timedelta

router = APIRouter(prefix="/telegram", tags=["telegram"])

temp_tokens = {}

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


async def send_telegram_photo(chat_id: str, photo_data, caption: str = ""):
    """
    Send photo to Telegram
    photo_data can be: file path (str), file object, base64 image, or bytes
    """
    url = f"{TELEGRAM_API}/sendPhoto"
    
    print(f"\n📸 Sending photo to {chat_id}")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            files = None
            data = {
                'chat_id': chat_id,
                'caption': caption,
                'parse_mode': 'HTML'
            }
            
            # Handle different photo input types
            if isinstance(photo_data, str) and photo_data.startswith('data:image'):
                # Base64 image
                if ',' in photo_data:
                    base64_data = photo_data.split(',')[1]
                else:
                    base64_data = photo_data
                image_data = base64.b64decode(base64_data)
                files = {'photo': ('qr_code.png', io.BytesIO(image_data), 'image/png')}
                
            elif isinstance(photo_data, bytes):
                # Bytes image
                files = {'photo': ('qr_code.png', io.BytesIO(photo_data), 'image/png')}
                
            elif isinstance(photo_data, str) and (photo_data.startswith('http://') or photo_data.startswith('https://')):
                # URL - download and send
                response = await client.get(photo_data)
                files = {'photo': ('qr_code.jpg', io.BytesIO(response.content), 'image/jpeg')}
                
            elif isinstance(photo_data, str) and Path(photo_data).exists():
                # Local file path
                with open(photo_data, 'rb') as photo_file:
                    files = {'photo': (Path(photo_data).name, photo_file, 'image/png')}
            else:
                print(f"   ❌ Unsupported photo data type: {type(photo_data)}")
                return {"ok": False, "error": "Unsupported photo data"}
            
            response = await client.post(url, files=files, data=data)
            result = response.json()
            print(f"   Result: {result}")
            return result
    except Exception as e:
        print(f"   ❌ Error sending photo: {e}")
        return {"ok": False, "error": str(e)}


async def send_telegram_photo_from_base64(chat_id: str, base64_image: str, caption: str = ""):
    """Send photo from base64 string to Telegram"""
    try:
        if ',' in base64_image:
            base64_data = base64_image.split(',')[1]
        else:
            base64_data = base64_image
        
        image_data = base64.b64decode(base64_data)
        
        url = f"{TELEGRAM_API}/sendPhoto"
        files = {'photo': ('qr_code.png', io.BytesIO(image_data), 'image/png')}
        data = {
            'chat_id': chat_id,
            'caption': caption,
            'parse_mode': 'HTML'
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, files=files, data=data)
            result = response.json()
            print(f"   ✅ Photo sent: {result.get('ok')}")
            return result
    except Exception as e:
        print(f"   ❌ Error sending photo from base64: {e}")
        return {"ok": False, "error": str(e)}


async def send_qr_code_to_telegram(chat_id: str, order_id: int, amount: float):
    """Generate and send QR code for order payment"""
    try:
        # Generate QR code
        khqr_data = KHQRGenerator.generate_khqr_data(
            bank_account=settings.BANK_ACCOUNT_NUMBER,
            bank_name=settings.BANK_NAME,
            account_name=settings.BANK_ACCOUNT_NAME,
            amount=float(amount),
            currency="USD",
            order_id=str(order_id)
        )
        
        qr_image = KHQRGenerator.generate_qr_base64(khqr_data)
        
        if qr_image:
            caption = f"📱 Scan this QR code to pay ${amount:.2f} for Order #{order_id}\n\n🏦 Bank: {settings.BANK_NAME}\n👤 Account: {settings.BANK_ACCOUNT_NAME}"
            return await send_telegram_photo_from_base64(chat_id, qr_image, caption)
        else:
            print(f"   ❌ QR code generation failed")
            return {"ok": False, "error": "QR generation failed"}
    except Exception as e:
        print(f"   ❌ Error sending QR code: {e}")
        return {"ok": False, "error": str(e)}


async def send_order_confirmation_with_qr(chat_id: str, order_id: int, amount: float, full_name: str):
    """Send full order confirmation with QR code"""
    
    # 1. Send text message
    message = f"""
✅ <b>Order Confirmed!</b>

<b>Order ID:</b> #{order_id}
<b>Total:</b> ${amount:.2f}

<b>💰 Payment Instructions:</b>

Please transfer <b>${amount:.2f}</b> to:

🏦 <b>Bank:</b> {settings.BANK_NAME}
👤 <b>Account Name:</b> {settings.BANK_ACCOUNT_NAME}
🔢 <b>Account Number:</b> <code>{settings.BANK_ACCOUNT_NUMBER}</code>

<b>Steps:</b>
1. Transfer the exact amount
2. Take screenshot of confirmation
3. Upload on the website

<i>Order will be processed after payment verification.</i>
"""
    
    await send_telegram_message(chat_id, message)
    
    # 2. Send QR code
    await send_qr_code_to_telegram(chat_id, order_id, amount)


@router.post("/connect")
async def connect_telegram(
    request: Request,
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
    
    try:
        await send_telegram_message(
            chat_id=user.telegram_chat_id,
            text="You have been disconnected from TeleShop notifications.\n\nSend /start to reconnect anytime."
        )
    except Exception as e:
        print(f"⚠️ Could not send disconnect message: {e}")
    
    user.telegram_chat_id = None
    await db.commit()
    
    return {"message": "Telegram disconnected successfully"}


@router.get("/status")
async def telegram_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, current_user.id)
    return {
        "connected": bool(user.telegram_chat_id),
        "chat_id": user.telegram_chat_id if user.telegram_chat_id else None
    }


@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle incoming Telegram messages"""
    try:
        data = await request.json()
        print(f"📩 FULL WEBHOOK DATA: {data}")
        
        if "message" in data:
            message = data["message"]
            chat_id = str(message["chat"]["id"])
            text = message.get("text", "")
            user_first_name = message["from"].get("first_name", "User")
            
            print(f"   From: {user_first_name} (Chat ID: {chat_id})")
            print(f"   Full Text: '{text}'")
            print(f"   Text Length: {len(text)}")
            
            if text and text.startswith("/start"):
                parts = text.split(" ", 1)
                print(f"   Parts: {parts}")
                
                if len(parts) > 1:
                    token = parts[1].strip()
                    print(f"   🔑 Token found: {token}")
                    print(f"   Active tokens: {list(temp_tokens.keys())}")
                    
                    if token in temp_tokens:
                        token_data = temp_tokens[token]
                        print(f"   Token data: {token_data}")
                        
                        if datetime.utcnow() < token_data["expires"]:
                            user_id = token_data["user_id"]
                            user = await db.get(User, user_id)
                            
                            if user:
                                user.telegram_chat_id = chat_id
                                await db.commit()
                                del temp_tokens[token]
                                
                                await send_telegram_message(
                                    chat_id,
                                    f"✅ <b>Connected Successfully!</b>\n\n"
                                    f"Welcome <b>{user.full_name}</b>! 🎉\n\n"
                                    f"Your account is now linked to Telegram.\n"
                                    f"You'll receive order updates automatically.\n\n"
                                    f"<b>📋 Quick Commands:</b>\n"
                                    f"/orders - View your orders\n"
                                    f"/help - Get help"
                                )
                                print(f"   ✅ AUTO-CONNECTED user {user_id}")
                                return {"ok": True}
                            else:
                                print(f"   ❌ User not found: {user_id}")
                        else:
                            print(f"   ❌ Token expired")
                            del temp_tokens[token]
                    
                    await send_telegram_message(
                        chat_id,
                        "⚠️ Connection link expired or invalid.\n"
                        "Please go back to the website and try again."
                    )
                    return {"ok": True}
                
                else:
                    print(f"   ℹ️ Normal /start (no token)")
                    
                    result = await db.execute(
                        select(User).where(User.telegram_chat_id == chat_id)
                    )
                    existing_user = result.scalars().first()
                    
                    if existing_user:
                        await send_telegram_message(
                            chat_id,
                            f"👋 <b>Welcome back, {existing_user.full_name}!</b>\n\n"
                            f"✅ Your account is connected.\n\n"
                            f"/orders - View your orders\n"
                            f"/help - Get help"
                        )
                    else:
                        await send_telegram_message(
                            chat_id,
                            f"👋 <b>Welcome to TeleShop Bot, {user_first_name}!</b>\n\n"
                            f"📱 <b>Your Chat ID:</b> <code>{chat_id}</code>\n\n"
                            f"To connect:\n"
                            f"1. Go to Profile → Telegram on website\n"
                            f"2. Click Auto-Connect or enter this Chat ID\n\n"
                            f"/help - See all commands"
                        )
                    return {"ok": True}
            
            if text == "/chatid":
                await send_telegram_message(chat_id, f"📱 <b>Your Chat ID:</b> <code>{chat_id}</code>")
                return {"ok": True}
            
            if text == "/orders":
                result = await db.execute(select(User).where(User.telegram_chat_id == chat_id))
                user = result.scalars().first()
                if user:
                    result = await db.execute(select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc()).limit(5))
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
                    await send_telegram_message(chat_id, "⚠️ Not connected. Send /start to connect.")
                return {"ok": True}
            
            if text == "/help":
                await send_telegram_message(chat_id, "❓ <b>Help</b>\n\n/start - Connect\n/orders - Orders\n/help - This message")
                return {"ok": True}
            
            await send_telegram_message(chat_id, "Send /start to connect!\n/help - Commands")
        
        return {"ok": True}
        
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return {"ok": False, "error": str(e)}


@router.get("/generate-token")
async def generate_connect_token(
    current_user: User = Depends(get_current_user),
):
    token = secrets.token_urlsafe(16)
    temp_tokens[token] = {
        "user_id": current_user.id,
        "expires": datetime.utcnow() + timedelta(minutes=30)
    }
    return {"token": token}


# ✅ NEW: Send QR code to specific chat
@router.post("/send-qr")
async def send_qr_to_telegram(
    order_id: int,
    amount: float,
    chat_id: str,
    current_user: User = Depends(get_current_user),
):
    """Admin: Send QR code to user's Telegram"""
    result = await send_qr_code_to_telegram(chat_id, order_id, amount)
    return {"success": result.get("ok", False), "message": "QR code sent" if result.get("ok") else "Failed to send"}


# ✅ NEW: Send order confirmation with QR
@router.post("/send-order-confirmation")
async def send_order_confirmation(
    order_id: int,
    chat_id: str,
    amount: float,
    full_name: str,
    current_user: User = Depends(get_current_user),
):
    """Admin: Send order confirmation with QR code"""
    await send_order_confirmation_with_qr(chat_id, order_id, amount, full_name)
    return {"message": "Order confirmation sent with QR code"}