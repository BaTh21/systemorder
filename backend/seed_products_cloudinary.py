# seed_products_cloudinary.py
import asyncio
import cloudinary
import cloudinary.uploader
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.product import Product, ProductImage
from app.models.category import Category
from app.utils import slugify
from decimal import Decimal

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def upload_local_images_to_cloudinary():
    """Upload all local product images to Cloudinary and update database"""
    
    products_dir = Path("uploads/products")
    if not products_dir.exists():
        print("No local images found!")
        return
    
    product_folders = [f for f in products_dir.iterdir() if f.is_dir()]
    print(f"Found {len(product_folders)} product folders")
    
    uploaded = 0
    for folder in product_folders:
        images = list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
        
        for image_file in images:
            try:
                print(f"📤 Uploading: {image_file.name}...")
                
                with open(image_file, "rb") as f:
                    result = cloudinary.uploader.upload(
                        f,
                        folder=f"teleshop/products/{folder.name}",
                        public_id=image_file.stem,
                        resource_type="image"
                    )
                
                print(f"   ✅ {result['secure_url']}")
                uploaded += 1
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    print(f"\n✅ Uploaded {uploaded} images to Cloudinary!")
    return uploaded

async def update_database_with_cloudinary_urls():
    """Update product image URLs in database to use Cloudinary"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as db:
        result = await db.execute(select(ProductImage))
        images = result.scalars().all()
        
        updated = 0
        for image in images:
            # Check if URL is local
            if image.image_url.startswith('/uploads/'):
                # Build Cloudinary URL
                # Extract folder and filename from path
                path_parts = image.image_url.split('/')
                if len(path_parts) >= 4:
                    folder = path_parts[3]  # products subfolder
                    filename = Path(path_parts[-1]).stem
                    
                    cloudinary_url = cloudinary.CloudinaryImage(
                        f"teleshop/products/{folder}/{filename}"
                    ).build_url(secure=True)
                    
                    image.image_url = cloudinary_url
                    updated += 1
                    print(f"Updated: {cloudinary_url}")
        
        await db.commit()
        print(f"\n✅ Updated {updated} image URLs in database")

if __name__ == "__main__":
    print("=" * 60)
    print("MIGRATING TO CLOUDINARY")
    print("=" * 60)
    
    # Upload local images
    upload_local_images_to_cloudinary()
    
    # Update database
    asyncio.run(update_database_with_cloudinary_urls())
    
    print("\n✅ Done! Check Cloudinary dashboard for uploaded images")