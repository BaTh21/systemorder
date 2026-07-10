from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.product import Product
from app.schemas.product import ProductOut, ProductDetail  # define these schemas

router = APIRouter(prefix="/products", tags=["products"])

@router.get("")
async def list_products(
    search: str = None,
    category_id: int = None,
    min_price: float = None,
    max_price: float = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).where(Product.is_active == True)
    if search:
        query = query.where(or_(Product.name.ilike(f"%{search}%"), Product.description.ilike(f"%{search}%")))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)

    if sort == "price_asc":
        query = query.order_by(Product.base_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.base_price.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    products = (await db.execute(query.offset((page-1)*limit).limit(limit))).scalars().all()
    return {"items": products, "total": total, "page": page, "limit": limit}

@router.get("/{slug}")
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalars().first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product