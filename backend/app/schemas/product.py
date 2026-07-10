from pydantic import BaseModel, validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class ProductImageOut(BaseModel):
    id: int
    image_url: str
    is_primary: bool

    class Config:
        orm_mode = True

class ProductVariantOut(BaseModel):
    id: int
    name: str
    price_modifier: Decimal
    stock: int

    class Config:
        orm_mode = True

class ProductBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    base_price: Decimal
    stock: int
    category_id: int
    supplier: str
    supplier_url: Optional[str] = None
    is_active: bool = True
    discount_percent: float = 0.0

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    stock: Optional[int] = None
    category_id: Optional[int] = None
    supplier: Optional[str] = None
    supplier_url: Optional[str] = None
    is_active: Optional[bool] = None
    discount_percent: Optional[float] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []
    # Optionally include category details
    category: Optional[dict] = None

    class Config:
        orm_mode = True

class ProductDetail(ProductOut):
    """Extended product detail including category and more"""
    pass