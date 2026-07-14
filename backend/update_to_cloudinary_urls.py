# update_to_cloudinary_urls.py
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.product import ProductImage

async def update_urls():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as db:
        result = await db.execute(select(ProductImage))
        images = result.scalars().all()
        
        updated = 0
        for image in images:
            if not image.image_url.startswith('http'):
                # Build Cloudinary URL based on the path
                path = Path(image.image_url)
                folder = path.parent.name if path.parent.name != 'products' else ''
                filename = path.stem
                
                # Generate Cloudinary URL
                cloudinary_url = (
                    f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}"
                    f"/image/upload/teleshop/products/{filename}"
                )
                
                print(f"Updating: {image.image_url[:50]}... → {cloudinary_url}")
                image.image_url = cloudinary_url
                updated += 1
        
        await db.commit()
        print(f"\n✅ Updated {updated} image URLs")

asyncio.run(update_urls())