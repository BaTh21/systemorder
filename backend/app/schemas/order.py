# app/schemas/order.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class OrderItemOut(BaseModel):
    id: int
    product_name_snapshot: str
    unit_price: Decimal
    quantity: int
    total_price: Decimal
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    user_id: int
    status: str
    subtotal: Decimal
    shipping_fee: Decimal
    service_fee: Decimal
    total: Decimal
    shipping_address: dict
    customer_notes: Optional[str] = None
    payment_method: Optional[str] = None
    payment_receipt_url: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
    
    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    shipping_address: dict
    customer_notes: Optional[str] = None
    payment_method: str = "bank_transfer"
    
    model_config = ConfigDict(from_attributes=True)