# app/services/telegram.py
from fastapi import Path
import httpx
from pathlib import Path as PathLib 
from app.core.config import settings
from app.core.database import async_session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.order import Order
from app.models.user import User
from app.services.khqr_service import KHQRGenerator

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

async def send_telegram_message(chat_id: str, text: str, parse_mode: str = "HTML"):
    """Send message to a Telegram chat"""
    print(f"\n📱 Sending Telegram message to: {chat_id}")
    
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
            
            if result.get("ok"):
                print(f"   ✅ Message sent successfully!")
            else:
                print(f"   ❌ Telegram API error: {result.get('description')}")
            
            return result
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return {"ok": False, "error": str(e)}


async def send_order_notification_to_admin(order_id: str):
    """Send new order notification to admin - runs in background"""
    print(f"\n🔔 [Background] Admin notification for Order #{order_id}")
    
    from app.core.database import async_session as create_session
    
    async with create_session() as db:
        try:
            result = await db.execute(
                select(Order)
                .options(
                    selectinload(Order.items),
                    selectinload(Order.user)
                )
                .where(Order.id == int(order_id))
            )
            order = result.scalars().first()
            
            if not order:
                print(f"   ❌ Order not found")
                return
            
            user = order.user
            if not user:
                print(f"   ❌ User not found")
                return
            
            items_text = ""
            for item in order.items:
                items_text += f"• {item.quantity}x {item.product_name_snapshot} - ${item.total_price}\n"
            
            message = f"""
🛒 <b>New Order #{order.id}</b>

<b>Customer:</b> {user.full_name}
<b>Email:</b> {user.email}
<b>Phone:</b> {user.phone or 'N/A'}

<b>Items:</b>
{items_text}
<b>Subtotal:</b> ${order.subtotal}
<b>Shipping:</b> ${order.shipping_fee}
<b>Service Fee:</b> ${order.service_fee}
<b>Total:</b> ${order.total}

<b>Payment:</b> {order.payment_method or 'N/A'}
<b>Notes:</b> {order.customer_notes or 'None'}
"""
            
            print(f"   📤 Sending to admin: {settings.TELEGRAM_ADMIN_CHAT_ID}")
            await send_telegram_message(settings.TELEGRAM_ADMIN_CHAT_ID, message)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()


async def send_order_confirmation_to_customer(order_id: str):
    """Send order confirmation to customer - runs in background"""
    print(f"\n🔔 [Background] Customer confirmation for Order #{order_id}")
    
    from app.core.database import async_session as create_session
    
    async with create_session() as db:
        try:
            result = await db.execute(
                select(Order)
                .options(selectinload(Order.user))
                .where(Order.id == int(order_id))
            )
            order = result.scalars().first()
            
            if not order or not order.user:
                print(f"   ❌ Order/User not found")
                return
            
            user = order.user
            
            if not user.telegram_chat_id:
                print(f"   ℹ️ User has no Telegram connected")
                return
            
            message = f"""
✅ <b>Order Confirmed!</b>

<b>Order ID:</b> #{order.id}
<b>Total:</b> ${order.total}

<b>💰 Payment Instructions:</b>

Please transfer <b>${order.total}</b> to:

🏦 <b>Bank:</b> {settings.BANK_NAME}
👤 <b>Account Name:</b> {settings.BANK_ACCOUNT_NAME}
🔢 <b>Account Number:</b> <code>{settings.BANK_ACCOUNT_NUMBER}</code>

<b>Steps:</b>
1. Transfer the exact amount
2. Take screenshot of confirmation
3. Upload on the website

<i>Order will be processed after payment verification.</i>
"""
            
            print(f"   📤 Sending to customer: {user.telegram_chat_id}")
            await send_telegram_message(user.telegram_chat_id, message)
            
            # Send QR code if available
            qr_path = PathLib(settings.QR_CODE_URL.lstrip('/'))
            if qr_path.exists():
                await send_telegram_photo(user.telegram_chat_id, str(qr_path))
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()


async def send_order_status_update(order_id: int, new_status: str):
    """Send order status update to customer - runs in background"""
    print(f"\n🔔 [Background] Status update for Order #{order_id}: {new_status}")
    
    from app.core.database import async_session as create_session
    
    async with create_session() as db:
        try:
            result = await db.execute(
                select(Order)
                .options(selectinload(Order.user))
                .where(Order.id == order_id)
            )
            order = result.scalars().first()
            
            if not order or not order.user:
                print(f"   ❌ Order/User not found")
                return
            
            user = order.user
            
            if not user.telegram_chat_id:
                print(f"   ℹ️ User has no Telegram connected")
                return
            
            status_messages = {
                "pending": "⏳ Your order has been received and is pending review.",
                "confirmed": "✅ Your order has been confirmed!",
                "waiting_payment": "💰 Please complete payment for your order.",
                "paid": "💳 Payment received! Processing your order.",
                "purchasing": "🛒 Purchasing your items from suppliers.",
                "shipping": "🚚 Your order is on the way!",
                "completed": "📦 Order delivered! Thank you!",
                "cancelled": "❌ Order cancelled. Contact support if needed."
            }
            
            status_value = new_status.value if hasattr(new_status, 'value') else str(new_status)
            message = f"<b>📢 Order Update - #{order.id}</b>\n\n"
            message += status_messages.get(status_value, f"Status: {status_value}")
            
            # 🔴 FIX: Format tracking info nicely for Telegram
            if status_value == "shipping" and order.tracking_number:
                tracking = order.tracking_number
                
                # Parse tracking info
                if ':' in tracking:
                    service_key = tracking.split(':')[0].strip()
                    tracking_id = tracking.split(':')[1].strip() if ':' in tracking else tracking
                    
                    service_names = {
                        'grab_express': '🚗 Grab Express (Car)',
                        'grab_bike': '🏍️ Grab Bike (Motorcycle)',
                        'nham24': '🛵 Nham24 Delivery',
                        'virak_buntham': '🚌 Virak Buntham Express',
                        'jnt_express': '📦 J&T Express',
                        'dhl': '✈️ DHL Express',
                        'other': '📋 Delivery Service',
                    }
                    
                    service_name = service_names.get(service_key, service_key)
                    
                    message += f"\n\n<b>📦 Delivery Information:</b>"
                    message += f"\n<b>Service:</b> {service_name}"
                    message += f"\n<b>Tracking ID:</b> <code>{tracking_id}</code>"
                    
                    # Add tracking tips based on service
                    if 'grab' in service_key:
                        message += f"\n\n<i>💡 You can track your Grab delivery in the Grab app.</i>"
                    elif 'nham24' in service_key:
                        message += f"\n\n<i>💡 Track your order in the Nham24 app.</i>"
                    elif 'dhl' in service_key:
                        message += f"\n\n<i>💡 Track at: https://www.dhl.com/en/express/tracking.html</i>"
                else:
                    message += f"\n\n<b>📦 Tracking Number:</b> <code>{tracking}</code>"
            
            if status_value == "waiting_payment":
                message += f"\n\n<b>Amount:</b> ${order.total}"
            
            print(f"   📤 Sending to customer: {user.telegram_chat_id}")
            await send_telegram_message(user.telegram_chat_id, message)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            import traceback
            traceback.print_exc()


async def send_telegram_photo(chat_id: str, photo_path: str, caption: str = "📱 Scan QR code to pay"):
    """Send photo/QR code to Telegram"""
    url = f"{TELEGRAM_API}/sendPhoto"
    
    async with httpx.AsyncClient() as client:
        try:
            with open(photo_path, 'rb') as photo:
                files = {'photo': photo}
                data = {
                    'chat_id': chat_id,
                    'caption': caption,
                    'parse_mode': 'HTML'
                }
                response = await client.post(url, files=files, data=data)
                return response.json()
        except Exception as e:
            print(f"Error sending photo: {e}")
            return {"ok": False}
        
async def send_payment_request_to_customer(order_id: str):
    """Send payment request with clear instructions (no QR)"""
    from app.core.database import async_session as create_session
    
    async with create_session() as db:
        try:
            result = await db.execute(
                select(Order)
                .options(selectinload(Order.user))
                .where(Order.id == int(order_id))
            )
            order = result.scalars().first()
            
            if not order or not order.user:
                return
            
            user = order.user
            
            if not user.telegram_chat_id:
                return
            
            amount = float(order.total) if order.total else 0
            
            # Send text message with clear instructions
            message = KHQRGenerator.get_payment_text_for_telegram(amount, str(order.id))
            await send_telegram_message(user.telegram_chat_id, message)
            
            # Also try to send QR code image separately
            khqr_data = KHQRGenerator.generate_khqr_data(
                bank_account="003039935",
                bank_name="ABA Bank",
                account_name="MOK KOLSAMBATH",
                amount=amount,
                order_id=str(order.id)
            )
            
            qr_image = KHQRGenerator.generate_qr_base64(khqr_data)
            
            if qr_image:
                # Send QR as photo
                await send_telegram_photo(
                    user.telegram_chat_id,
                    qr_image,
                    f"📱 Scan this QR with your ABA Mobile App to pay ${amount:.2f} for Order #{order.id}"
                )
            
        except Exception as e:
            print(f"Error sending payment request: {e}")
