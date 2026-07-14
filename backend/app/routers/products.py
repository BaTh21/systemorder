# app/routers/products.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload  # ← ADD THIS IMPORT
from app.core.database import get_db
from app.models.product import Product, ProductImage, ProductVariant

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
    # Build query with eager loading of relationships
    query = select(Product).where(Product.is_active == True)
    
    # EAGERLY LOAD IMAGES AND VARIANTS
    query = query.options(
        selectinload(Product.images),      # ← LOAD IMAGES
        selectinload(Product.variants),     # ← LOAD VARIANTS  
        selectinload(Product.category)      # ← LOAD CATEGORY
    )
    
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"), 
                Product.description.ilike(f"%{search}%")
            )
        )
    if category_id:
        query = query.where(Product.category_id == category_id)
    if min_price is not None:
        query = query.where(Product.base_price >= min_price)
    if max_price is not None:
        query = query.where(Product.base_price <= max_price)

    # Sorting
    if sort == "price_asc":
        query = query.order_by(Product.base_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.base_price.desc())
    elif sort == "name_asc":
        query = query.order_by(Product.name.asc())
    elif sort == "name_desc":
        query = query.order_by(Product.name.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    # Get total count
    count_query = select(func.count()).select_from(
        select(Product).where(Product.is_active == True).subquery()
    )
    if category_id:
        count_query = count_query.where(Product.category_id == category_id)
    
    total = (await db.execute(count_query)).scalar()
    
    # Get paginated results
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()
    
    # Convert to list of dicts with proper serialization
    products_list = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "description": product.description,
            "base_price": float(product.base_price) if product.base_price else 0,
            "stock": product.stock,
            "category_id": product.category_id,
            "supplier": product.supplier,
            "supplier_url": product.supplier_url,
            "is_active": product.is_active,
            "discount_percent": product.discount_percent or 0,
            "created_at": str(product.created_at),
            "updated_at": str(product.updated_at),
            
            # INCLUDE IMAGES
            "images": [
                {
                    "id": img.id,
                    "image_url": img.image_url,
                    "is_primary": img.is_primary
                }
                for img in (product.images or [])
            ],
            
            # INCLUDE VARIANTS
            "variants": [
                {
                    "id": var.id,
                    "name": var.name,
                    "price_modifier": float(var.price_modifier) if var.price_modifier else 0,
                    "stock": var.stock
                }
                for var in (product.variants or [])
            ],
            
            # INCLUDE CATEGORY
            "category": {
                "id": product.category.id,
                "name": product.category.name,
                "slug": product.category.slug
            } if product.category else None
        }
        products_list.append(product_dict)
    
    return {
        "items": products_list,
        "total": total or 0,
        "page": page,
        "limit": limit,
        "total_pages": max(1, ((total or 0) + limit - 1) // limit)
    }


@router.get("/{slug}")
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    """Get single product with all details"""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category)
        )
        .where(Product.slug == slug)
    )
    product = result.scalars().first()
    
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Return with images and variants
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "base_price": float(product.base_price) if product.base_price else 0,
        "stock": product.stock,
        "category_id": product.category_id,
        "supplier": product.supplier,
        "supplier_url": product.supplier_url,
        "is_active": product.is_active,
        "discount_percent": product.discount_percent or 0,
        "created_at": str(product.created_at),
        "updated_at": str(product.updated_at),
        
        "images": [
            {
                "id": img.id,
                "image_url": img.image_url,
                "is_primary": img.is_primary
            }
            for img in (product.images or [])
        ],
        
        "variants": [
            {
                "id": var.id,
                "name": var.name,
                "price_modifier": float(var.price_modifier) if var.price_modifier else 0,
                "stock": var.stock
            }
            for var in (product.variants or [])
        ],
        
        "category": {
            "id": product.category.id,
            "name": product.category.name,
            "slug": product.category.slug
        } if product.category else None
    }