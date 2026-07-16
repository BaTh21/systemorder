# fix_remaining.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from app.models.category import Category
import requests
import io

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# Working image URLs
FIX_URLS = {
    "sports": "https://images.unsplash.com/photo-1461896836934-bd45ba65e5b6?w=800&q=80",
    "sports-outdoors": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
}

async def fix():
    print("\n🔧 Fixing remaining categories...\n")
    
    async with async_session() as db:
        for slug, url in FIX_URLS.items():
            result = await db.execute(select(Category).where(Category.slug == slug))
            cat = result.scalars().first()
            
            if not cat:
                print(f"  ⚠️ {slug} not found")
                continue
            
            print(f"  📤 {cat.name}...", end=" ")
            
            try:
                response = requests.get(url, timeout=15)
                img_data = io.BytesIO(response.content)
                
                cloudinary.uploader.upload(
                    img_data,
                    folder="teleshop/categories",
                    public_id=slug,
                    resource_type="image",
                    overwrite=True,
                    format="jpg"
                )
                
                cat.image_url = f"https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/{slug}"
                print("✅")
            except Exception as e:
                print(f"❌ {e}")
        
        await db.commit()
    
    print("\n✅ All categories fixed!")

if __name__ == "__main__":
    asyncio.run(fix())