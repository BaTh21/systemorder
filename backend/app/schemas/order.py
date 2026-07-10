from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime

class OrderItemOut(BaseModel):
    product_name_snapshot: str
    unit_price: Decimal
    quantity: int
    total_price: Decimal

class OrderOut(BaseModel):
    id: UUID
    status: str
    subtotal: Decimal
    shipping_fee: Decimal
    service_fee: Decimal
    total: Decimal
    shipping_address: dict
    customer_notes: Optional[str]
    created_at: datetime
    items: List[OrderItemOut]

class OrderCreate(BaseModel):
    shipping_address: dict
    customer_notes: Optional[str] = None
    payment_method: str = "bank_transfer"