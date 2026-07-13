from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.deps import get_current_user, admin_required
from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.product import Product
from typing import Optional
from uuid import UUID
from app.routers.telegram import send_order_status_update

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin_required)])

@router.get("/orders")
async def get_all_orders(status: Optional[OrderStatus] = None, db: AsyncSession = Depends(get_db)):
    query = select(Order)
    if status:
        query = query.where(Order.status == status)
    result = await db.execute(query.order_by(Order.created_at.desc()))
    return result.scalars().all()

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: UUID, status: OrderStatus, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = status
    await db.commit()
    return {"message": "Status updated"}

@router.get("/products")
async def admin_list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product))
    return result.scalars().all()

@router.post("/products")
async def create_product(product_data: dict, db: AsyncSession = Depends(get_db)):
    # In production, use a proper schema
    product = Product(**product_data)
    db.add(product)
    await db.commit()
    return product

@router.get("/customers")
async def list_customers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role == "customer"))
    return result.scalars().all()

@router.get("/dashboard")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar()
    total_revenue = (await db.execute(select(func.sum(Order.total)).where(Order.status == OrderStatus.completed))).scalar()
    return {"total_orders": total_orders, "total_revenue": total_revenue or 0}

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: UUID, 
    status: OrderStatus,
    tracking_number: str = None,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    
    old_status = order.status
    order.status = status
    
    if tracking_number:
        order.tracking_number = tracking_number
    
    await db.commit()
    
    # Send Telegram notification to customer
    if background_tasks:
        background_tasks.add_task(send_order_status_update, order, status.value)
    
    return {"message": "Status updated"}