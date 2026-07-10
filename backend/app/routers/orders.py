from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.deps import get_current_user
from app.core.database import get_db
from app.services.order import create_order_from_cart
from app.schemas.order import OrderCreate, OrderOut
from app.models.order import Order
from uuid import UUID

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("", response_model=OrderOut)
async def place_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    order = await create_order_from_cart(db, current_user, order_data, background_tasks)
    return order

@router.get("")
async def get_orders(current_user = Depends(get_current_user), db = Depends(get_db)):
    result = await db.execute(
        select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    )
    return result.scalars().all()

@router.get("/{order_id}")
async def get_order(order_id: UUID, current_user = Depends(get_current_user), db = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    return order

@router.post("/{order_id}/payment-proof")
async def upload_payment_proof(
    order_id: UUID,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    order = await db.get(Order, order_id)
    if not order or order.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    # Save file to disk or S3 (simplified)
    file_location = f"uploads/payments/{order_id}_{file.filename}"
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)
    order.payment_receipt_url = file_location
    await db.commit()
    return {"message": "Payment proof uploaded"}