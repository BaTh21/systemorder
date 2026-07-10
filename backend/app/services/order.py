from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant
from app.core.config import settings
from app.services.telegram import send_order_notification
from decimal import Decimal

async def create_order_from_cart(db: AsyncSession, user, order_data, background_tasks: BackgroundTasks):
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id)
    )
    cart_items = result.scalars().all()
    if not cart_items:
        raise HTTPException(400, "Cart is empty")

    subtotal = Decimal(0)
    order_items = []
    for item in cart_items:
        product = await db.get(Product, item.product_id)
        if not product or not product.is_active:
            raise HTTPException(400, f"Product {product.name} is unavailable")
        variant = await db.get(ProductVariant, item.variant_id) if item.variant_id else None
        unit_price = product.base_price + (variant.price_modifier if variant else 0)
        if product.discount_percent > 0:
            unit_price = unit_price * (1 - Decimal(product.discount_percent) / 100)
        total_price = unit_price * item.quantity
        subtotal += total_price
        order_items.append(OrderItem(
            product_id=product.id,
            variant_id=variant.id if variant else None,
            product_name_snapshot=product.name + (f" ({variant.name})" if variant else ""),
            unit_price=unit_price,
            quantity=item.quantity,
            total_price=total_price
        ))

    shipping_fee = Decimal("5.00")  # placeholder
    service_fee = (subtotal * Decimal(str(settings.SERVICE_FEE_RATE))).quantize(Decimal("0.01"))
    total = subtotal + shipping_fee + service_fee

    order = Order(
        user_id=user.id,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        service_fee=service_fee,
        total=total,
        shipping_address=order_data.shipping_address,
        customer_notes=order_data.customer_notes,
        payment_method=order_data.payment_method
    )
    db.add(order)
    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)

    await db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    await db.commit()
    await db.refresh(order)

    # Send Telegram notification in background
    background_tasks.add_task(send_order_notification, str(order.id))
    return order