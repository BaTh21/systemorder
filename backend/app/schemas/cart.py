from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from decimal import Decimal

class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    # You might add product details for display
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None

    class Config:
        orm_mode = True

class CartOut(BaseModel):
    items: list[CartItemOut]
    total_items: int
    subtotal: Decimal