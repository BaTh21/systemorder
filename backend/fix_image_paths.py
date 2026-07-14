# fix_image_paths.py
import asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
from app.core.config import settings
from app.models.product import ProductImage

async def fix_image_urls():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as db:
        result = await db.execute(select(ProductImage))
        images = result.scalars().all()
        
        fixed = 0
        for image in images:
            old_url = image.image_url
            new_url = old_url
            
            # Fix Windows absolute paths
            if '\\' in old_url or 'D:' in old_url:
                # Extract just the uploads part
                if 'uploads' in old_url:
                    new_url = '/' + old_url.split('uploads', 1)[1].replace('\\', '/')
                    if not new_url.startswith('/uploads'):
                        new_url = '/uploads' + new_url
            
            # Fix missing leading slash
            elif old_url.startswith('uploads/'):
                new_url = '/' + old_url
            
            if new_url != old_url:
                image.image_url = new_url
                fixed += 1
                print(f"Fixed: {old_url[:50]}... → {new_url[:50]}...")
        
        await db.commit()
        print(f"\n✅ Fixed {fixed} image URLs")

if __name__ == "__main__":
    asyncio.run(fix_image_urls())