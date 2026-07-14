# app/routers/cart.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.cart import CartItem
from app.models.product import Product, ProductImage, ProductVariant

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("")
async def get_cart(
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Get current user's cart"""
    print(f"🛒 Get cart for user: {current_user.email} (ID: {current_user.id})")
    
    # Eagerly load relationships to avoid MissingGreenlet error
    result = await db.execute(
        select(CartItem)
        .where(CartItem.user_id == current_user.id)
    )
    cart_items = result.scalars().all()
    
    enriched_items = []
    for item in cart_items:
        # Load product with images eagerly
        product_result = await db.execute(
            select(Product)
            .options(selectinload(Product.images))
            .where(Product.id == item.product_id)
        )
        product = product_result.scalars().first()
        
        # Load variant if exists
        variant = None
        if item.variant_id:
            variant = await db.get(ProductVariant, item.variant_id)
        
        # Calculate price
        unit_price = float(product.base_price) if product else 0
        if variant:
            unit_price += float(variant.price_modifier)
        if product and product.discount_percent > 0:
            unit_price = unit_price * (1 - product.discount_percent / 100)
        
        total_price = unit_price * item.quantity
        
        # Get product image safely
        product_image = None
        if product and product.images:
            primary_image = next((img for img in product.images if img.is_primary), None)
            if primary_image:
                product_image = primary_image.image_url
            elif len(product.images) > 0:
                product_image = product.images[0].image_url
        
        enriched_items.append({
            "id": item.id,
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "quantity": item.quantity,
            "product_name": product.name if product else "Unknown",
            "product_image": product_image,
            "unit_price": round(unit_price, 2),
            "total_price": round(total_price, 2)
        })
    
    print(f"   Found {len(enriched_items)} items")
    return enriched_items

@router.post("/items")
async def add_to_cart(
    product_id: int,
    variant_id: int = None,
    quantity: int = 1,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add item to cart"""
    print(f"🛒 Add to cart: User ID={current_user.id}, Product={product_id}, Qty={quantity}")
    
    # Validate product
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(400, f"Product ID {product_id} not found")
    if not product.is_active:
        raise HTTPException(400, "Product is not available")
    
    # Check if already in cart
    result = await db.execute(
        select(CartItem).where(
            CartItem.user_id == current_user.id,
            CartItem.product_id == product_id,
            CartItem.variant_id == variant_id
        )
    )
    existing_item = result.scalars().first()
    
    if existing_item:
        existing_item.quantity += quantity
        print(f"   Updated quantity to {existing_item.quantity}")
    else:
        cart_item = CartItem(
            user_id=current_user.id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity
        )
        db.add(cart_item)
        print(f"   Created new cart item")
    
    await db.commit()
    return {"message": "Added to cart", "product_id": product_id, "quantity": quantity}

@router.put("/items/{item_id}")
async def update_cart_item(
    item_id: int, 
    quantity: int, 
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Update cart item quantity"""
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(404, "Cart item not found")
    
    if quantity <= 0:
        await db.delete(item)
    else:
        item.quantity = quantity
    
    await db.commit()
    return {"message": "Updated"}

@router.delete("/items/{item_id}")
async def remove_cart_item(
    item_id: int, 
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Remove item from cart"""
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(404, "Cart item not found")
    
    await db.delete(item)
    await db.commit()
    return {"message": "Removed"}

@router.delete("")
async def clear_cart(
    current_user = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """Clear entire cart"""
    await db.execute(
        delete(CartItem).where(CartItem.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "Cart cleared"}