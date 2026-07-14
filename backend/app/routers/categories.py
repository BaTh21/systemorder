from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.category import Category

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("")
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories"""
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    
    # Return list of categories with image_url
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "image_url": cat.image_url,
            "parent_id": cat.parent_id,
            "created_at": str(cat.created_at) if cat.created_at else None
        }
        for cat in categories
    ]

@router.get("/{slug}")
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    """Get single category by slug"""
    result = await db.execute(select(Category).where(Category.slug == slug))
    category = result.scalars().first()
    
    if not category:
        raise HTTPException(404, "Category not found")
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "image_url": category.image_url,
        "parent_id": category.parent_id,
        "created_at": str(category.created_at) if category.created_at else None
    }