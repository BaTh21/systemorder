# app/routers/admin.py
from datetime import datetime, timedelta

import cloudinary
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import shutil
import os
from pathlib import Path

from app.core.deps import get_current_user, admin_required
from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.product import Product, ProductImage, ProductVariant
from app.models.category import Category
from app.core.config import settings
from app.utils import slugify
from sqlalchemy.orm import selectinload
from app.models.order import Order, OrderStatus, OrderItem
from app.services.telegram import send_order_status_update
from app.services.cloudinary_service import upload_image


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin_required)])

@router.get("/orders")
async def get_all_orders(
    status: Optional[OrderStatus] = None, 
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get all orders with items eagerly loaded"""
    query = select(Order).options(selectinload(Order.items))
    if status:
        query = query.where(Order.status == status)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    query = query.order_by(Order.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    # Build response
    orders_list = []
    for order in orders:
        items_list = []
        for item in (order.items or []):
            items_list.append({
                "id": item.id,
                "product_name_snapshot": item.product_name_snapshot,
                "unit_price": float(item.unit_price),
                "quantity": item.quantity,
                "total_price": float(item.total_price)
            })
        
        orders_list.append({
            "id": order.id,
            "user_id": order.user_id,
            "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
            "subtotal": float(order.subtotal) if order.subtotal else 0,
            "total": float(order.total) if order.total else 0,
            "shipping_address": order.shipping_address,
            "customer_notes": order.customer_notes,
            "payment_method": order.payment_method,
            "tracking_number": order.tracking_number,
            "created_at": str(order.created_at),
            "items": items_list
        })
    
    return {
        "items": orders_list,
        "total": total or 0,
        "page": page,
        "limit": limit,
        "total_pages": max(1, ((total or 0) + limit - 1) // limit)
    }

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: OrderStatus,
    tracking_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """Update order status and send Telegram notification"""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    
    old_status = order.status
    order.status = status
    
    if tracking_number:
        order.tracking_number = tracking_number
    
    await db.commit()
    
    # 🔔 Schedule Telegram notification - pass order_id (int) and status (str)
    if background_tasks:
        status_value = status.value if hasattr(status, 'value') else str(status)
        background_tasks.add_task(send_order_status_update, order.id, status_value)
        print(f"   ✅ Telegram notification scheduled for order #{order.id}")
    
    return {
        "message": "Status updated",
        "order_id": order.id,
        "old_status": str(old_status),
        "new_status": str(status)
    }

@router.get("/products")
async def admin_list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Get all products with filters for admin"""
    query = select(Product).options(
        selectinload(Product.images),      # ← ADD THIS
        selectinload(Product.category)      # ← ADD THIS
    )
    
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Get paginated results
    query = query.order_by(Product.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()
    
    return {
        "items": products,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/products/{product_id}")
async def get_product_detail(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single product with all details"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Load relationships
    await db.refresh(product, ['images', 'variants', 'category'])
    
    return product

@router.post("/products")
async def create_product(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    base_price: float = Form(...),
    stock: int = Form(0),
    category_id: int = Form(...),
    supplier: str = Form(...),
    supplier_url: Optional[str] = Form(None),
    discount_percent: float = Form(0.0),
    is_active: bool = Form(True),
    variants: Optional[str] = Form("[]"),
    images: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    """Create a new product with Cloudinary images"""
    import json
    
    try:
        # Validate required fields
        if not name or not name.strip():
            raise HTTPException(400, "Product name is required")
        
        if base_price < 0:
            raise HTTPException(400, "Price cannot be negative")
        
        if stock < 0:
            raise HTTPException(400, "Stock cannot be negative")
        
        if discount_percent < 0 or discount_percent > 100:
            raise HTTPException(400, "Discount must be between 0 and 100")
        
        # Handle is_active conversion
        if isinstance(is_active, str):
            is_active = is_active.lower() in ('true', '1', 'yes', 'on')
        
        # Check if category exists
        category = await db.get(Category, category_id)
        if not category:
            raise HTTPException(400, f"Category with ID {category_id} not found")
        
        # Generate unique slug
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while True:
            result = await db.execute(
                select(Product).where(Product.slug == slug)
            )
            if not result.scalars().first():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Create product
        product = Product(
            name=name.strip(),
            slug=slug,
            description=description.strip() if description else None,
            base_price=base_price,
            stock=stock,
            category_id=category_id,
            supplier=supplier.strip(),
            supplier_url=supplier_url.strip() if supplier_url else None,
            discount_percent=discount_percent,
            is_active=is_active
        )
        
        db.add(product)
        await db.flush()
        
        # Handle image uploads to Cloudinary
        if images and len(images) > 0:
            for i, image in enumerate(images):
                if image.filename:
                    try:
                        # Upload to Cloudinary
                        result = await upload_image(
                            image,
                            folder=f"products/{product.id}",
                            public_id=f"{slug}_{i}"
                        )
                        
                        # Create image record with Cloudinary URL
                        product_image = ProductImage(
                            product_id=product.id,
                            image_url=result["url"],  # Store Cloudinary URL directly
                            is_primary=(i == 0)
                        )
                        db.add(product_image)
                        print(f"✅ Uploaded to Cloudinary: {result['url']}")
                        
                    except Exception as e:
                        print(f"❌ Error uploading to Cloudinary: {e}")
                        raise HTTPException(500, f"Image upload failed: {str(e)}")
        
        # Handle variants
        if variants and variants.strip() and variants != "[]":
            try:
                variants_data = json.loads(variants)
                if isinstance(variants_data, list):
                    for variant_data in variants_data:
                        variant_name = variant_data.get('name', '').strip()
                        if not variant_name:
                            continue
                        
                        variant = ProductVariant(
                            product_id=product.id,
                            name=variant_name,
                            price_modifier=float(variant_data.get('price_modifier', 0)),
                            stock=int(variant_data.get('stock', 0))
                        )
                        db.add(variant)
            except (json.JSONDecodeError, ValueError, TypeError) as e:
                print(f"Error parsing variants: {str(e)}")
        
        await db.commit()
        await db.refresh(product)
        
        print(f"Product created: ID={product.id}, Name={product.name}")
        return product
    
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error: {str(e)}")
        raise HTTPException(500, f"Internal server error: {str(e)}")

@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(None),
    description: str = Form(None),
    base_price: float = Form(None),
    stock: int = Form(None),
    category_id: int = Form(None),
    supplier: str = Form(None),
    supplier_url: str = Form(None),
    discount_percent: float = Form(None),
    is_active: bool = Form(None),
    images: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing product"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Update fields if provided
    if name is not None:
        product.name = name
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while True:
            existing = await db.execute(
                select(Product).where(Product.slug == slug, Product.id != product_id)
            )
            if not existing.scalars().first():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        product.slug = slug
    
    if description is not None: product.description = description
    if base_price is not None: product.base_price = base_price
    if stock is not None: product.stock = stock
    if category_id is not None: product.category_id = category_id
    if supplier is not None: product.supplier = supplier
    if supplier_url is not None: product.supplier_url = supplier_url
    if discount_percent is not None: product.discount_percent = discount_percent
    if is_active is not None: product.is_active = is_active
    
    # ===== FIX: Upload images to Cloudinary instead of local =====
    if images and images[0].filename:
        for i, image in enumerate(images):
            if image.filename:
                try:
                    # Upload to Cloudinary
                    result = await upload_image(
                        image,
                        folder=f"products/{product.id}",
                        public_id=f"{product.slug}_{i}_{datetime.now().timestamp()}"
                    )
                    
                    # Create image record with Cloudinary URL
                    product_image = ProductImage(
                        product_id=product.id,
                        image_url=result["url"],  # Cloudinary URL
                        is_primary=False
                    )
                    db.add(product_image)
                    print(f"✅ Image uploaded to Cloudinary: {result['url']}")
                    
                except Exception as e:
                    print(f"❌ Cloudinary upload error: {e}")
                    raise HTTPException(500, f"Image upload failed: {str(e)}")
    
    await db.commit()
    await db.refresh(product)
    return product

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Permanently delete a product"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Delete related images from Cloudinary
    result = await db.execute(
        select(ProductImage).where(ProductImage.product_id == product_id)
    )
    images = result.scalars().all()
    
    for image in images:
        try:
            # Extract public_id from Cloudinary URL and delete
            if image.image_url and 'cloudinary.com' in image.image_url:
                parts = image.image_url.split('/')
                # Find the public_id (everything after version)
                upload_index = parts.index('upload')
                public_id_parts = parts[upload_index + 2:]  # Skip version
                public_id = '/'.join(public_id_parts).rsplit('.', 1)[0]
                
                cloudinary.uploader.destroy(public_id)
                print(f"🗑️ Deleted from Cloudinary: {public_id}")
        except Exception as e:
            print(f"⚠️ Could not delete Cloudinary image: {e}")
    
    # Delete product (cascade will delete images and variants)
    await db.delete(product)
    await db.commit()
    
    return {"message": "Product deleted successfully", "product_id": product_id}

@router.put("/products/{product_id}/toggle-active")
async def toggle_product_active(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Toggle product active status"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    product.is_active = not product.is_active
    await db.commit()
    
    return {
        "message": f"Product {'activated' if product.is_active else 'deactivated'}",
        "is_active": product.is_active,
        "product_id": product_id
    }

@router.post("/products/{product_id}/images")
async def add_product_images(
    product_id: int,
    images: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Add images to an existing product - using Cloudinary"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    for i, image in enumerate(images):
        if image.filename:
            try:
                # Upload to Cloudinary
                result = await upload_image(
                    image,
                    folder=f"products/{product.id}",
                    public_id=f"{product.slug}_{i}_{datetime.now().timestamp()}"
                )
                
                product_image = ProductImage(
                    product_id=product.id,
                    image_url=result["url"],  # Cloudinary URL
                    is_primary=False
                )
                db.add(product_image)
                print(f"✅ Uploaded to Cloudinary: {result['url']}")
                
            except Exception as e:
                print(f"❌ Cloudinary error: {e}")
                raise HTTPException(500, f"Image upload failed: {str(e)}")
    
    await db.commit()
    return {"message": f"{len(images)} images added"}

@router.delete("/products/images/{image_id}")
async def delete_product_image(
    image_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Delete a specific product image"""
    image = await db.get(ProductImage, image_id)
    if not image:
        raise HTTPException(404, "Image not found")
    
    # Delete from Cloudinary
    if image.image_url and 'cloudinary.com' in image.image_url:
        try:
            parts = image.image_url.split('/')
            upload_index = parts.index('upload')
            public_id_parts = parts[upload_index + 2:]
            public_id = '/'.join(public_id_parts).rsplit('.', 1)[0]
            
            result = cloudinary.uploader.destroy(public_id)
            print(f"🗑️ Cloudinary: {result}")
        except Exception as e:
            print(f"⚠️ Cloudinary delete error: {e}")
    
    # Delete from database
    await db.delete(image)
    await db.commit()
    
    return {"message": "Image deleted successfully", "image_id": image_id}
@router.post("/products/{product_id}/variants")
async def add_product_variant(
    product_id: int,
    name: str = Form(...),
    price_modifier: float = Form(0),
    stock: int = Form(0),
    db: AsyncSession = Depends(get_db)
):
    """Add variant to a product"""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    
    variant = ProductVariant(
        product_id=product_id,
        name=name,
        price_modifier=price_modifier,
        stock=stock
    )
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    
    return variant

@router.put("/products/variants/{variant_id}")
async def update_product_variant(
    variant_id: int,
    name: str = Form(None),
    price_modifier: float = Form(None),
    stock: int = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Update a product variant"""
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(404, "Variant not found")
    
    if name is not None:
        variant.name = name
    if price_modifier is not None:
        variant.price_modifier = price_modifier
    if stock is not None:
        variant.stock = stock
    
    await db.commit()
    await db.refresh(variant)
    return variant

@router.delete("/products/variants/{variant_id}")
async def delete_product_variant(
    variant_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a product variant"""
    variant = await db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(404, "Variant not found")
    
    await db.delete(variant)
    await db.commit()
    
    return {"message": "Variant deleted", "variant_id": variant_id}

@router.get("/customers")
async def list_customers(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """List all customers with pagination and search"""
    query = select(User).where(User.role == "customer")
    
    if search:
        query = query.where(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Get paginated results
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    customers = result.scalars().all()
    
    # Return consistent format with items array
    return {
        "items": customers,
        "total": total or 0,
        "page": page,
        "limit": limit,
        "total_pages": max(1, ((total or 0) + limit - 1) // limit)
    }

@router.get("/dashboard")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics"""
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar()
    total_revenue = (await db.execute(
        select(func.sum(Order.total)).where(Order.status == OrderStatus.completed)
    )).scalar()
    total_products = (await db.execute(select(func.count(Product.id)))).scalar()
    total_customers = (await db.execute(
        select(func.count(User.id)).where(User.role == "customer")
    )).scalar()
    
    return {
        "total_orders": total_orders or 0,
        "total_revenue": float(total_revenue) if total_revenue else 0,
        "total_products": total_products or 0,
        "total_customers": total_customers or 0
    }

# Category Management
@router.get("/categories")
async def admin_list_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories for admin"""
    result = await db.execute(select(Category).order_by(Category.name))
    categories = result.scalars().all()
    
    # Return serialized data
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "image_url": cat.image_url,
            "parent_id": cat.parent_id,
            "created_at": str(cat.created_at) if cat.created_at else None,
            "updated_at": str(cat.updated_at) if cat.updated_at else None
        }
        for cat in categories
    ]


@router.post("/categories")
async def create_category(
    name: str = Form(...),
    parent_id: Optional[int] = Form(None),
    image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    """Create a new category with Cloudinary image"""
    
    print(f"\n📁 Creating category: {name}")
    
    if not name or not name.strip():
        raise HTTPException(400, "Category name is required")
    
    # Generate unique slug
    base_slug = slugify(name)
    slug = base_slug
    counter = 1
    while True:
        existing = await db.execute(select(Category).where(Category.slug == slug))
        if not existing.scalars().first():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Upload category image to Cloudinary
    image_url = None
    if image and image.filename:
        try:
            print(f"📤 Uploading category image to Cloudinary...")
            print(f"   File: {image.filename}")
            print(f"   Content type: {image.content_type}")
            
            result = await upload_image(
                image, 
                folder="categories",
                public_id=slug
            )
            image_url = result["url"]
            print(f"✅ Cloudinary URL: {image_url}")
            
        except Exception as e:
            print(f"❌ Cloudinary upload error: {str(e)}")
            raise HTTPException(500, f"Failed to upload image to Cloudinary: {str(e)}")
    else:
        print(f"ℹ️ No image provided for category")
    
    if parent_id is not None:
        parent = await db.get(Category, parent_id)
        if not parent:
            raise HTTPException(400, "Parent category not found")
    
    category = Category(
        name=name.strip(),
        slug=slug,
        image_url=image_url,  # Store Cloudinary URL
        parent_id=parent_id
    )
    
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    print(f"✅ Category created: ID={category.id}, Image={image_url}")
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "image_url": category.image_url,
        "parent_id": category.parent_id,
        "created_at": str(category.created_at),
        "message": "Category created successfully"
    }


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    name: str = Form(None),
    parent_id: Optional[int] = Form(None),
    image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    """Update a category"""
    
    print(f"\n📁 Updating category ID: {category_id}")
    
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    
    # Update name and slug
    if name is not None and name.strip():
        category.name = name.strip()
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while True:
            existing = await db.execute(
                select(Category).where(
                    Category.slug == slug,
                    Category.id != category_id
                )
            )
            if not existing.scalars().first():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        category.slug = slug
    
    # Update parent
    if parent_id is not None:
        if parent_id == 0:
            category.parent_id = None
        elif parent_id == category_id:
            raise HTTPException(400, "Category cannot be its own parent")
        else:
            parent = await db.get(Category, parent_id)
            if not parent:
                raise HTTPException(400, "Parent category not found")
            category.parent_id = parent_id
    
    # Upload new image to Cloudinary if provided
    if image and image.filename:
        try:
            print(f"📤 Uploading new category image to Cloudinary...")
            print(f"   File: {image.filename}")
            
            result = await upload_image(
                image,
                folder="categories",
                public_id=category.slug
            )
            category.image_url = result["url"]
            print(f"✅ New Cloudinary URL: {result['url']}")
            
        except Exception as e:
            print(f"❌ Cloudinary upload error: {str(e)}")
            raise HTTPException(500, f"Failed to upload image: {str(e)}")
    else:
        print(f"ℹ️ No new image provided")
    
    await db.commit()
    await db.refresh(category)
    
    print(f"✅ Category updated: ID={category.id}, Image={category.image_url}")
    
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "image_url": category.image_url,
        "parent_id": category.parent_id,
        "message": "Category updated successfully"
    }


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a category"""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")
    
    # Check if category has products
    products_count = await db.execute(
        select(func.count(Product.id)).where(Product.category_id == category_id)
    )
    if products_count.scalar() > 0:
        raise HTTPException(400, 
            "Cannot delete category with associated products")
    
    # Check subcategories
    subcategories_count = await db.execute(
        select(func.count(Category.id)).where(Category.parent_id == category_id)
    )
    if subcategories_count.scalar() > 0:
        raise HTTPException(400, 
            "Cannot delete category with subcategories")
    
    await db.delete(category)
    await db.commit()
    
    return {"message": "Category deleted", "category_id": category_id}

@router.get("/payment-info")
async def get_payment_info():
    """Get payment information for customers"""
    return {
        "bank_name": settings.BANK_NAME,
        "account_name": settings.BANK_ACCOUNT_NAME,
        "account_number": settings.BANK_ACCOUNT_NUMBER,
        "swift_code": settings.BANK_SWIFT_CODE,
        "routing_number": settings.BANK_ROUTING_NUMBER,
        "qr_code_url": settings.QR_CODE_URL,
        "instructions": [
            "1. Transfer the exact amount to the bank account above",
            "2. Take a screenshot of the transfer confirmation",
            "3. Upload the screenshot in your order details page",
            "4. Your order will be confirmed within 1-2 hours after payment verification"
        ]
    }

@router.put("/payment-info")
async def update_payment_info(
    bank_name: str = Form(None),
    account_name: str = Form(None),
    account_number: str = Form(None),
    swift_code: str = Form(None),
    routing_number: str = Form(None),
    qr_code: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    """Update payment information (Admin only)"""
    # This would update the settings or a database table
    # For now, update environment variables or a settings table
    
    if qr_code:
        upload_dir = Path(settings.UPLOAD_DIR) / "payments"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / "qr-code.png"
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(qr_code.file, buffer)
    
    return {"message": "Payment info updated"}


@router.get("/dashboard/live")
async def dashboard_live_stats(db: AsyncSession = Depends(get_db)):
    """Get live dashboard statistics"""
    
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    
    # ===== REVENUE (Excluding Cancelled) =====
    
    # Total Revenue = All orders EXCEPT cancelled
    total_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status != OrderStatus.cancelled)
    )).scalar() or 0
    
    # Completed Revenue
    completed_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.status == OrderStatus.completed)
    )).scalar() or 0
    
    # Active Revenue (not completed yet, not cancelled)
    active_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(
            Order.status != OrderStatus.cancelled,
            Order.status != OrderStatus.completed
        )
    )).scalar() or 0
    
    # Today's Revenue (exclude cancelled)
    today_revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(
            Order.created_at >= today_start,
            Order.status != OrderStatus.cancelled
        )
    )).scalar() or 0
    
    # Today's Completed Revenue
    today_completed = (await db.execute(
        select(func.coalesce(func.sum(Order.total), 0))
        .where(
            Order.status == OrderStatus.completed,
            Order.updated_at >= today_start
        )
    )).scalar() or 0
    
    # ===== ORDER COUNTS =====
    
    # Total orders (excluding cancelled)
    total_orders = (await db.execute(
        select(func.count(Order.id))
        .where(Order.status != OrderStatus.cancelled)
    )).scalar() or 0
    
    # All orders including cancelled (for admin reference)
    all_orders_including_cancelled = (await db.execute(
        select(func.count(Order.id))
    )).scalar() or 0
    
    # Today's orders (excluding cancelled)
    today_orders = (await db.execute(
        select(func.count(Order.id))
        .where(
            Order.created_at >= today_start,
            Order.status != OrderStatus.cancelled
        )
    )).scalar() or 0
    
    # Completed orders
    completed_orders = (await db.execute(
        select(func.count(Order.id))
        .where(Order.status == OrderStatus.completed)
    )).scalar() or 0
    
    # Cancelled orders
    cancelled_orders = (await db.execute(
        select(func.count(Order.id))
        .where(Order.status == OrderStatus.cancelled)
    )).scalar() or 0
    
    # Pending orders (needs attention)
    pending_orders_count = (await db.execute(
        select(func.count(Order.id))
        .where(Order.status.in_([
            OrderStatus.pending,
            OrderStatus.waiting_payment,
        ]))
    )).scalar() or 0
    
    # ===== PRODUCT STATS =====
    active_products = (await db.execute(
        select(func.count(Product.id))
        .where(Product.is_active == True)
    )).scalar() or 0
    
    low_stock = (await db.execute(
        select(func.count(Product.id))
        .where(Product.is_active == True, Product.stock > 0, Product.stock <= 10)
    )).scalar() or 0
    
    out_of_stock = (await db.execute(
        select(func.count(Product.id))
        .where(Product.is_active == True, Product.stock == 0)
    )).scalar() or 0
    
    # ===== CUSTOMER STATS =====
    total_customers = (await db.execute(
        select(func.count(User.id))
        .where(User.role == "customer")
    )).scalar() or 0
    
    new_customers_today = (await db.execute(
        select(func.count(User.id))
        .where(User.role == "customer", User.created_at >= today_start)
    )).scalar() or 0
    
    # ===== RECENT ORDERS =====
    recent_orders_result = await db.execute(
        select(Order)
        .options(selectinload(Order.user))
        .order_by(Order.created_at.desc())  # Latest first
        .limit(15)
    )
    recent_orders = recent_orders_result.unique().scalars().all()
    
    recent_orders_list = []
    for order in recent_orders:
        recent_orders_list.append({
            "id": order.id,
            "customer": order.user.full_name if order.user else "N/A",
            "total": float(order.total) if order.total else 0,
            "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
            "created_at": str(order.created_at),
        })
    
    # ===== REVENUE CHART (Last 7 days - Exclude cancelled) =====
    revenue_chart = []
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        day_start = datetime.combine(date, datetime.min.time())
        day_end = datetime.combine(date + timedelta(days=1), datetime.min.time())
        
        # Day revenue (excluding cancelled)
        day_revenue = (await db.execute(
            select(func.coalesce(func.sum(Order.total), 0))
            .where(
                Order.created_at >= day_start,
                Order.created_at < day_end,
                Order.status != OrderStatus.cancelled
            )
        )).scalar() or 0
        
        # Day completed revenue
        day_completed = (await db.execute(
            select(func.coalesce(func.sum(Order.total), 0))
            .where(
                Order.status == OrderStatus.completed,
                Order.updated_at >= day_start,
                Order.updated_at < day_end
            )
        )).scalar() or 0
        
        # Day orders count (excluding cancelled)
        day_orders = (await db.execute(
            select(func.count(Order.id))
            .where(
                Order.created_at >= day_start,
                Order.created_at < day_end,
                Order.status != OrderStatus.cancelled
            )
        )).scalar() or 0
        
        revenue_chart.append({
            "date": date.strftime("%a %d"),
            "revenue": float(day_revenue),
            "completed": float(day_completed),
            "orders": day_orders,
        })
    
    # ===== TOP PRODUCTS (Only from non-cancelled orders) =====
    top_products = []
    try:
        top_result = await db.execute(
            select(
                OrderItem.product_name_snapshot,
                func.sum(OrderItem.quantity).label('qty'),
                func.sum(OrderItem.total_price).label('rev')
            )
            .join(Order, OrderItem.order_id == Order.id)
            .where(Order.status != OrderStatus.cancelled)
            .group_by(OrderItem.product_name_snapshot)
            .order_by(func.sum(OrderItem.total_price).desc())
            .limit(5)
        )
        top_products = [
            {"name": row[0], "quantity": int(row[1]), "revenue": float(row[2])}
            for row in top_result.all() if row[0]
        ]
    except:
        pass
    
    return {
        "stats": {
            "total_revenue": float(total_revenue),           # Excludes cancelled
            "completed_revenue": float(completed_revenue),   # Only completed
            "active_revenue": float(active_revenue),         # In progress
            "today_revenue": float(today_revenue),           # Today's (excl cancelled)
            "today_completed": float(today_completed),       # Today's completed
            "total_orders": total_orders,                    # Excludes cancelled
            "all_orders": all_orders_including_cancelled,    # Including cancelled
            "today_orders": today_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "pending_orders": pending_orders_count,
            "active_products": active_products,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "total_customers": total_customers,
            "new_customers_today": new_customers_today,
        },
        "recent_orders": recent_orders_list,
        "revenue_chart": revenue_chart,
        "top_products": top_products,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
@router.get("/orders/{order_id}")
async def admin_get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get any order with full details"""
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.user)
        )
        .where(Order.id == order_id)
    )
    order = result.scalars().first()
    
    if not order:
        raise HTTPException(404, "Order not found")
    
    items_list = []
    for item in (order.items or []):
        items_list.append({
            "id": item.id,
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "product_name_snapshot": item.product_name_snapshot,
            "unit_price": float(item.unit_price),
            "quantity": item.quantity,
            "total_price": float(item.total_price)
        })
    
    return {
        "id": order.id,
        "user_id": order.user_id,
        "user": {
            "id": order.user.id,
            "full_name": order.user.full_name,
            "email": order.user.email,
            "phone": order.user.phone,
        } if order.user else None,
        "status": str(order.status.value) if hasattr(order.status, 'value') else str(order.status),
        "subtotal": float(order.subtotal) if order.subtotal else 0,
        "shipping_fee": float(order.shipping_fee) if order.shipping_fee else 0,
        "service_fee": float(order.service_fee) if order.service_fee else 0,
        "total": float(order.total) if order.total else 0,
        "shipping_address": order.shipping_address,
        "customer_notes": order.customer_notes,
        "payment_method": order.payment_method,
        "payment_receipt_url": order.payment_receipt_url,
        "tracking_number": order.tracking_number,
        "created_at": str(order.created_at),
        "updated_at": str(order.updated_at) if order.updated_at else None,
        "items": items_list
    }
    
@router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: int,
    data: dict,  # Accept JSON body
    db: AsyncSession = Depends(get_db)
):
    """Admin: Update customer details"""
    customer = await db.get(User, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    print(f"📝 Updating customer {customer_id}: {data}")
    
    if data.get("full_name"):
        customer.full_name = data["full_name"]
    if data.get("email"):
        customer.email = data["email"]
    if data.get("phone") is not None:
        customer.phone = data["phone"]
    
    await db.commit()
    await db.refresh(customer)
    
    return {
        "message": "Customer updated successfully",
        "customer": {
            "id": customer.id,
            "full_name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "is_active": customer.is_active,
        }
    }
    
@router.put("/customers/{customer_id}/toggle-active")
async def toggle_customer_active(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Toggle customer active status"""
    customer = await db.get(User, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    customer.is_active = not customer.is_active
    await db.commit()
    return {"message": f"Customer {'activated' if customer.is_active else 'deactivated'}", "is_active": customer.is_active}

@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Delete customer"""
    customer = await db.get(User, customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    
    await db.delete(customer)
    await db.commit()
    return {"message": "Customer deleted"}