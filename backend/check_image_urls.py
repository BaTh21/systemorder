# check_image_urls.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.product import Product, ProductImage

async def check():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as db:
        result = await db.execute(
            select(Product).limit(5)
        )
        products = result.scalars().all()
        
        for product in products:
            print(f"\nProduct: {product.name}")
            
            img_result = await db.execute(
                select(ProductImage).where(ProductImage.product_id == product.id)
            )
            images = img_result.scalars().all()
            
            for img in images:
                print(f"  URL: {img.image_url}")
                print(f"  Is Cloudinary: {'Yes' if 'cloudinary' in img.image_url else 'No'}")

asyncio.run(check())