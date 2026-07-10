from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str
    image_url: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    children: List['CategoryOut'] = []  # For nested tree

    class Config:
        orm_mode = True

# Required for recursive model
CategoryOut.update_forward_refs()