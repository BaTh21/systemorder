# app/routers/payment.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.order import Order
from app.services.khqr_service import KHQRGenerator
from sqlalchemy import select

router = APIRouter(prefix="/payment", tags=["payment"])

class KHQRRequest(BaseModel):
    order_id: int
    amount: float

@router.post("/generate-khqr")
async def generate_khqr(
    data: KHQRRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate KHQR code for Bakong payment"""
    
    # Verify order belongs to user
    result = await db.execute(
        select(Order).where(Order.id == data.order_id, Order.user_id == current_user.id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    # Generate KHQR data
    khqr_data = KHQRGenerator.generate_khqr_data(
        bank_account=settings.BANK_ACCOUNT_NUMBER,
        bank_name=settings.BANK_NAME,
        account_name=settings.BANK_ACCOUNT_NAME,
        amount=data.amount,
        currency="USD",
        order_id=str(data.order_id)
    )
    
    # Generate QR code image
    qr_image = KHQRGenerator.generate_qr_base64(khqr_data)
    
    return {
        "khqr_data": khqr_data,
        "qr_image": qr_image,
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
    
    # Use simple format that ABA can scan
    qr_data = KHQRGenerator.get_simple_payment_qr(amount, str(order_id))
    qr_image = KHQRGenerator.generate_qr_base64(qr_data)
    
    return {
        "order_id": order_id,
        "amount": amount,
        "qr_data": qr_data,
        "qr_image": qr_image,
        "bank_name": "ABA Bank",
        "bank_account": "003039935",
        "account_name": "MOK KOLSAMBATH",
    }