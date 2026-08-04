# app/routers/payment.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user, admin_required
from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.services.khqr_service import KHQRGenerator
from app.services.telegram import send_telegram_message
from app.services.notification_service import send_order_status_notification
from app.services.cloudinary_service import upload_image  # ✅ Import Cloudinary upload
from datetime import datetime
import os

router = APIRouter(prefix="/payment", tags=["payment"])

class KHQRRequest(BaseModel):
    order_id: int
    amount: float


@router.post("/upload-proof/{order_id}")
async def upload_payment_proof(
    order_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload payment proof to Cloudinary"""
    
    # Verify order belongs to user
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    if order.status not in [OrderStatus.pending, OrderStatus.waiting_payment]:
        raise HTTPException(400, f"Order is not pending payment. Current status: {order.status.value}")
    
    # Validate file
    if not file.filename:
        raise HTTPException(400, "No file uploaded")
    
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only JPG, PNG, GIF, and WebP images are allowed")
    
    # ✅ Upload to Cloudinary
    try:
        # Create a unique public_id for the payment proof
        public_id = f"payment_proof_{order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        result = await upload_image(
            file,
            folder="payments",
            public_id=public_id
        )
        file_url = result["url"]  # Cloudinary URL
        print(f"✅ Payment proof uploaded to Cloudinary: {file_url}")
        print(f"   Public ID: {result['public_id']}")
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        raise HTTPException(500, f"Failed to upload payment proof: {str(e)}")
    
    # Update order with Cloudinary URL
    order.payment_receipt_url = file_url
    order.status = OrderStatus.waiting_payment
    await db.commit()
    
    # Notify admin
    if settings.TELEGRAM_ADMIN_CHAT_ID:
        admin_message = f"""
📸 <b>Payment Proof Uploaded</b>

<b>Order:</b> #{order.id}
<b>Customer:</b> {current_user.full_name}
<b>Amount:</b> ${order.total}

🔗 <b>View Order:</b> /admin/orders/{order.id}
📱 <b>Customer:</b> {current_user.phone}
"""
        await send_telegram_message(settings.TELEGRAM_ADMIN_CHAT_ID, admin_message)
    
    return {
        "message": "Payment proof uploaded successfully",
        "order_id": order_id,
        "receipt_url": file_url,
        "status": order.status.value
    }


@router.post("/mark-paid/{order_id}")
async def mark_order_paid(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Admin: Mark order as paid"""
    
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.user))
        .where(Order.id == order_id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    if order.status != OrderStatus.waiting_payment:
        raise HTTPException(400, f"Order is not waiting for payment. Current status: {order.status.value}")
    
    order.status = OrderStatus.paid
    await db.commit()
    await db.refresh(order)
    
    if order.user and order.user.telegram_chat_id:
        background_tasks.add_task(
            send_order_status_notification,
            order.user.id,
            order.id,
            "paid"
        )
    
    return {
        "message": "Order marked as paid",
        "order_id": order_id,
        "status": order.status.value
    }


@router.post("/mark-cash-payment/{order_id}")
async def mark_cash_payment(
    order_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Admin: Mark order as cash payment received"""
    
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.user))
        .where(Order.id == order_id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    if order.status not in [OrderStatus.pending, OrderStatus.waiting_payment]:
        raise HTTPException(400, f"Order is not pending payment. Current status: {order.status.value}")
    
    order.status = OrderStatus.paid
    order.payment_method = "cash"
    await db.commit()
    await db.refresh(order)
    
    if order.user and order.user.telegram_chat_id:
        background_tasks.add_task(
            send_order_status_notification,
            order.user.id,
            order.id,
            "paid"
        )
    
    return {
        "message": "Cash payment recorded",
        "order_id": order_id,
        "status": order.status.value
    }


@router.post("/generate-khqr")
async def generate_khqr(
    data: KHQRRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate KHQR code for Bakong payment"""
    
    result = await db.execute(
        select(Order).where(Order.id == data.order_id, Order.user_id == current_user.id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    if order.status not in [OrderStatus.pending, OrderStatus.waiting_payment]:
        raise HTTPException(400, f"Order is not pending payment. Current status: {order.status.value}")
    
    khqr_data = KHQRGenerator.generate_khqr_data(
        bank_account=settings.BANK_ACCOUNT_NUMBER,
        bank_name=settings.BANK_NAME,
        account_name=settings.BANK_ACCOUNT_NAME,
        amount=float(data.amount),
        currency="USD",
        order_id=str(data.order_id)
    )
    
    qr_image = KHQRGenerator.generate_qr_base64(khqr_data)
    
    return {
        "khqr_data": khqr_data,
        "qr_image": qr_image,
        "order_id": data.order_id,
        "amount": data.amount,
        "bank_info": {
            "bank_name": settings.BANK_NAME,
            "account_name": settings.BANK_ACCOUNT_NAME,
            "account_number": settings.BANK_ACCOUNT_NUMBER,
            "swift_code": settings.BANK_SWIFT_CODE,
            "amount": data.amount,
        },
        "instructions": [
            "1. Open your Bakong app or any Cambodian bank app (ABA, ACLEDA, Wing, etc.)",
            "2. Scan the QR code",
            "3. Confirm the amount and complete payment",
            "4. Upload payment screenshot on the order page",
        ]
    }


@router.get("/khqr-info")
async def get_khqr_info(
    order_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get KHQR payment info for an order"""
    
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    amount = float(order.total) if order.total else 0
    
    khqr_data = KHQRGenerator.generate_khqr_data(
        bank_account=settings.BANK_ACCOUNT_NUMBER,
        bank_name=settings.BANK_NAME,
        account_name=settings.BANK_ACCOUNT_NAME,
        amount=amount,
        order_id=str(order_id)
    )
    
    qr_image = KHQRGenerator.generate_qr_base64(khqr_data)
    
    return {
        "order_id": order_id,
        "amount": amount,
        "qr_image": qr_image,
        "khqr_data": khqr_data,
        "bank_name": settings.BANK_NAME,
        "bank_account": settings.BANK_ACCOUNT_NUMBER,
        "account_name": settings.BANK_ACCOUNT_NAME,
    }