from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class CartItemCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    
    class Config:
        from_attributes = True

class CartOut(BaseModel):
    items: list[CartItemOut] = []
    total_items: int = 0
    subtotal: Decimal = Decimal("0.00")
    
    class Config:
        from_attributes = True