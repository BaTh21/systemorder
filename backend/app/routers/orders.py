# app/routers/orders.py
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_user
from app.core.database import get_db
from app.services.order import create_order_from_cart
from app.models.order import Order, OrderItem

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("")
async def place_order(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Place a new order"""
    try:
        body = await request.json()
        print(f"📦 Order request: {body}")
        
        shipping_address = body.get("shipping_address")
        if not shipping_address:
            raise HTTPException(400, "shipping_address is required")
        
        customer_notes = body.get("customer_notes", "")
        payment_method = body.get("payment_method", "bank_transfer")
        shipping_fee = body.get("shipping_fee", 5.00)
        
        class OrderData:
            def __init__(self, shipping_address, customer_notes, payment_method, shipping_fee):
                self.shipping_address = shipping_address
                self.customer_notes = customer_notes
                self.payment_method = payment_method
                self.shipping_fee = shipping_fee
        
        order_data = OrderData(shipping_address, customer_notes, payment_method, shipping_fee)
        
        order = await create_order_from_cart(db, current_user, order_data, background_tasks)
        
        # Fetch with items
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order.id)
        )
        order_with_items = result.scalars().first()
        
        items_list = []
        if order_with_items and order_with_items.items:
            for item in order_with_items.items:
                items_list.append({
                    "id": item.id,
                    "product_id": item.product_id,
                    "variant_id": item.variant_id,
                    "product_name_snapshot": item.product_name_snapshot,
                    "unit_price": float(item.unit_price),
                    "quantity": item.quantity,
                    "total_price": float(item.total_price)
                })
        
        return {
            "id": order.id,
            "user_id": order.user_id,
            "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
            "subtotal": float(order.subtotal),
            "shipping_fee": float(order.shipping_fee),
            "service_fee": float(order.service_fee),
            "total": float(order.total),
            "shipping_address": order.shipping_address,
            "customer_notes": order.customer_notes,
            "payment_method": order.payment_method,
            "payment_receipt_url": order.payment_receipt_url,
            "tracking_number": order.tracking_number,
            "created_at": str(order.created_at),
            "items": items_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error placing order: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"Error: {str(e)}")

@router.get("")
async def get_orders(
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Get current user's orders"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.asc()) 
    )
    orders = result.unique().scalars().all()
    
    orders_list = []
    for order in orders:
        items_list = []
        for item in (order.items or []):
            items_list.append({
                "id": item.id,
                "product_name_snapshot": item.product_name_snapshot,
                "unit_price": float(item.unit_price),
                "quantity": item.quantity,
                "total_price": float(item.total_price)
            })
        
        customer_name = order.user.full_name if order.user else "N/A"
        
        orders_list.append({
            "id": order.id,
            "customer": customer_name,
            "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
            "total": float(order.total) if order.total else 0,
            "created_at": str(order.created_at),
            "items": items_list
        })
    
    return orders_list

@router.get("/{order_id}")
async def get_order(
    order_id: int,
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Get order by ID - Customers see only their orders, Admins see all"""
    
    # Build query with eager loading
    query = select(Order).options(
        selectinload(Order.items),
        selectinload(Order.user)
    )
    
    # If not admin, only show their own orders
    if current_user.role != "admin":
        query = query.where(
            Order.id == order_id,
            Order.user_id == current_user.id
        )
    else:
        query = query.where(Order.id == order_id)
    
    result = await db.execute(query)
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    # Build response
    items_list = []
    for item in (order.items or []):
        items_list.append({
            "id": item.id,
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "product_name_snapshot": item.product_name_snapshot,
            "unit_price": float(item.unit_price),
            "quantity": item.quantity,
            "total_price": float(item.total_price)
        })
    
    return {
        "id": order.id,
        "user_id": order.user_id,
        "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
        "subtotal": float(order.subtotal) if order.subtotal else 0,
        "shipping_fee": float(order.shipping_fee) if order.shipping_fee else 0,
        "service_fee": float(order.service_fee) if order.service_fee else 0,
        "total": float(order.total) if order.total else 0,
        "shipping_address": order.shipping_address,
        "customer_notes": order.customer_notes,
        "payment_method": order.payment_method,
        "payment_receipt_url": order.payment_receipt_url,
        "tracking_number": order.tracking_number,
        "created_at": str(order.created_at),
        "updated_at": str(order.updated_at) if order.updated_at else None,
        "items": items_list
    }


@router.post("/{order_id}/payment-proof")
async def upload_payment_proof(
    order_id: int,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload payment receipt"""
    order = await db.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    
    import os
    from pathlib import Path
    
    upload_dir = Path("uploads/payments")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_location = f"uploads/payments/{order_id}_{file.filename}"
    
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    
    order.payment_receipt_url = f"/{file_location}"
    await db.commit()
    
    return {"message": "Payment proof uploaded", "order_id": order_id}