from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user
from app.core.database import get_db
from app.models.cart import CartItem
from app.models.product import Product, ProductVariant

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("")
async def get_cart(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    return result.scalars().all()

@router.post("/items")
async def add_to_cart(
    product_id: int,
    variant_id: int = None,
    quantity: int = 1,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate product exists and is active
    product = await db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(400, "Product not available")
    item = CartItem(user_id=current_user.id, product_id=product_id, variant_id=variant_id, quantity=quantity)
    db.add(item)
    await db.commit()
    return {"message": "Added"}

@router.put("/items/{item_id}")
async def update_cart_item(item_id: int, quantity: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(404, "Cart item not found")
    item.quantity = quantity
    await db.commit()
    return {"message": "Updated"}

@router.delete("/items/{item_id}")
async def remove_cart_item(item_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    item = await db.get(CartItem, item_id)
    if not item or item.user_id != current_user.id:
        raise HTTPException(404, "Cart item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Removed"}

@router.delete("")
async def clear_cart(current_user = Depends(get_current_user), db = Depends(get_db)):
    await db.execute(delete(CartItem).where(CartItem.user_id == current_user.id))
    await db.commit()
    return {"message": "Cleared"}