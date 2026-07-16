# fix_sports.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from app.models.category import Category
import requests
import io
from PIL import Image

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

async def fix_sports():
    print("\n🔧 Fixing Sports category...")
    
    async with async_session() as db:
        result = await db.execute(select(Category).where(Category.slug == "sports"))
        cat = result.scalars().first()
        
        if not cat:
            print("❌ Sports category not found!")
            return
        
        # Try multiple URLs
        urls = [
            "https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg",
            "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
        ]
        
        success = False
        for url in urls:
            try:
                print(f"  Trying: {url[:60]}...")
                resp = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
                
                if resp.status_code == 200 and len(resp.content) > 1000:
                    # Verify it's a valid image
                    try:
                        img = Image.open(io.BytesIO(resp.content))
                        img.verify()
                    except:
                        print("  ⚠️ Not a valid image, trying next...")
                        continue
                    
                    # Upload to Cloudinary
                    img_data = io.BytesIO(resp.content)
                    cloudinary.uploader.upload(
                        img_data,
                        folder="teleshop/categories",
                        public_id="sports",
                        resource_type="image",
                        overwrite=True,
                        format="jpg"
                    )
                    
                    cat.image_url = "https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/sports"
                    await db.commit()
                    print("  ✅ Sports category FIXED!")
                    success = True
                    break
                    
            except Exception as e:
                print(f"  ⚠️ {str(e)[:50]}")
        
        if not success:
            print("  ❌ All URLs failed. Creating a placeholder instead...")
            # Create a simple sports image
            img = Image.new('RGB', (800, 500), '#EA580C')
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 60)
            except:
                font = ImageFont.load_default()
            draw.text((300, 200), "⚽ SPORTS", fill='white', font=font)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            
            cloudinary.uploader.upload(
                buf,
                folder="teleshop/categories",
                public_id="sports",
                resource_type="image",
                overwrite=True,
                format="png"
            )
            
            cat.image_url = "https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/sports"
            await db.commit()
            print("  ✅ Sports placeholder created!")

if __name__ == "__main__":
    asyncio.run(fix_sports())