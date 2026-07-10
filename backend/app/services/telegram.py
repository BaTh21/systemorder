import httpx
from app.core.config import settings
from app.core.database import async_session
from sqlalchemy import select
from app.models.order import Order
from app.models.user import User

async def send_order_notification(order_id: str):
    async with async_session() as db:
        result = await db.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalars().first()
        if not order:
            return
        # Fetch user
        user = await db.get(User, order.user_id)
        items_text = "\n".join(
            [f"{item.quantity}x {item.product_name_snapshot} - ${item.total_price}" for item in order.items]
        )
        message = f"""
🛒 *New Order #{order.id}*

*Customer:* {user.full_name}
*Phone:* {user.phone}
*Address:* {order.shipping_address}

*Items:*
{items_text}

*Subtotal:* ${order.subtotal}
*Shipping:* ${order.shipping_fee}
*Service Fee:* ${order.service_fee}
*Total:* ${order.total}

*Notes:* {order.customer_notes or 'None'}

[Contact Customer](tg://user?id={user.telegram_chat_id or ''})
"""
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": settings.TELEGRAM_ADMIN_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload)