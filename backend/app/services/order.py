# app/services/order.py
from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.cart import CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product, ProductVariant
from app.core.config import settings
from decimal import Decimal
from app.services.telegram import send_order_notification_to_admin, send_order_confirmation_to_customer

async def create_order_from_cart(db: AsyncSession, user, order_data, background_tasks: BackgroundTasks):
    """Create order from cart items, decrease stock, and send notifications"""
    
    print(f"🛒 Creating order for user {user.id}")
    
    # Fetch cart items
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id)
    )
    cart_items = result.scalars().all()
    
    if not cart_items:
        raise HTTPException(400, "Cart is empty")
    
    subtotal = Decimal("0.00")
    order_items = []
    
    for item in cart_items:
        # Load product
        product_result = await db.execute(
            select(Product).options(selectinload(Product.images))
            .where(Product.id == item.product_id)
        )
        product = product_result.scalars().first()
        
        if not product or not product.is_active:
            raise HTTPException(400, f"Product '{item.product_name_snapshot}' is unavailable")
        
        # Check stock
        variant = None
        if item.variant_id:
            variant = await db.get(ProductVariant, item.variant_id)
            if variant and variant.stock < item.quantity:
                raise HTTPException(400, f"Not enough stock for {product.name} ({variant.name}). Available: {variant.stock}")
            if variant:
                variant.stock -= item.quantity 
            if product.stock < item.quantity:
                raise HTTPException(400, f"Not enough stock for {product.name}. Available: {product.stock}")
            product.stock -= item.quantity 
        
        # Calculate price
        unit_price = product.base_price
        if variant:
            unit_price += variant.price_modifier
        
        if product.discount_percent > 0:
            discount = Decimal(str(product.discount_percent)) / Decimal("100")
            unit_price = unit_price * (Decimal("1") - discount)
        
        total_price = unit_price * item.quantity
        subtotal += total_price
        
        variant_name = f" ({variant.name})" if variant else ""
        order_item = OrderItem(
            product_id=product.id,
            variant_id=variant.id if variant else None,
            product_name_snapshot=f"{product.name}{variant_name}",
            unit_price=unit_price,
            quantity=item.quantity,
            total_price=total_price
        )
        order_items.append(order_item)
    
    shipping_fee = Decimal("5.00")
    service_fee = (subtotal * Decimal(str(settings.SERVICE_FEE_RATE))).quantize(Decimal("0.01"))
    total = subtotal + shipping_fee + service_fee
    
    # Create order
    order = Order(
        user_id=user.id,
        status="pending",
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        service_fee=service_fee,
        total=total,
        shipping_address=order_data.shipping_address,
        customer_notes=order_data.customer_notes,
        payment_method=order_data.payment_method
    )
    db.add(order)
    await db.flush()
    
    # Add order items
    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)
    
    # Clear cart
    await db.execute(
        delete(CartItem).where(CartItem.user_id == user.id)
    )
    
    await db.commit()
    await db.refresh(order)
    
    print(f"✅ Order created: ID={order.id}, Total=${total}")
    
    # Send notifications
    background_tasks.add_task(send_order_notification_to_admin, str(order.id))
    if user.telegram_chat_id:
        background_tasks.add_task(send_order_confirmation_to_customer, str(order.id))
    
    return order