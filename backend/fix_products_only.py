# fix_products_only.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from PIL import Image, ImageDraw, ImageFont
import io
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.product import Product, ProductImage

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

def get_fonts():
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/Arial.ttf",
    ]
    for font_path in font_paths:
        try:
            font_large = ImageFont.truetype(font_path, 100)
            font_medium = ImageFont.truetype(font_path, 40)
            font_small = ImageFont.truetype(font_path, 24)
            return font_large, font_medium, font_small
        except:
            continue
    return ImageFont.load_default(), ImageFont.load_default(), ImageFont.load_default()

def create_product_image(name, color_hex, icon):
    img = Image.new('RGB', (800, 800), color_hex)
    draw = ImageDraw.Draw(img, 'RGBA')
    font_large, font_medium, font_small = get_fonts()
    
    for x in range(0, 800, 50):
        draw.line([(x, 0), (x, 800)], fill=(255, 255, 255, 12), width=1)
    for y in range(0, 800, 50):
        draw.line([(0, y), (800, y)], fill=(255, 255, 255, 12), width=1)
    
    for y in range(600, 800):
        alpha = min(int((y - 600) * 0.7), 150)
        draw.line([(0, y), (800, y)], fill=(0, 0, 0, alpha))
    
    bbox = draw.textbbox((0, 0), icon, font=font_large)
    icon_w = bbox[2] - bbox[0]
    icon_h = bbox[3] - bbox[1]
    icon_x = (800 - icon_w) / 2
    icon_y = (500 - icon_h) / 2 - 30
    draw.text((icon_x, icon_y), icon, fill=(255, 255, 255, 255), font=font_large)
    
    words = name.split()
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        bbox = draw.textbbox((0, 0), ' '.join(current_line), font=font_small)
        if bbox[2] - bbox[0] > 700:
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    lines.append(' '.join(current_line))
    
    y_start = 580
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_small)
        w = bbox[2] - bbox[0]
        draw.text(((800 - w) / 2, y_start), line, fill=(255, 255, 255, 255), font=font_small)
        y_start += 35
    
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes

PRODUCT_COLORS = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#D946EF", "#0EA5E9", "#E11D48", "#22C55E",
]

PRODUCT_ICONS = [
    "📱", "💻", "🎧", "📷", "⌚", "🎮", "👟", "👗", "👔", "👜",
    "💄", "🏠", "🍳", "⚽", "🏋️", "📚", "🎸", "🚗", "🐾", "💍",
    "🖥️", "🎵", "🏆",
]

async def fix_products():
    print("\n" + "="*60)
    print("📦 FIXING PRODUCT IMAGES")
    print("="*60 + "\n")
    
    async with async_session() as db:
        # EAGERLY LOAD images relationship
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.images))  # THIS IS THE FIX
            .where(Product.is_active == True)
        )
        products = result.unique().scalars().all()
        
        print(f"Found {len(products)} products\n")
        
        success = 0
        failed = 0
        
        for i, product in enumerate(products):
            try:
                color = PRODUCT_COLORS[i % len(PRODUCT_COLORS)]
                icon = PRODUCT_ICONS[i % len(PRODUCT_ICONS)]
                
                print(f"📦 {product.name}...", end=" ")
                
                # Create and upload image
                img_data = create_product_image(product.name, color, icon)
                
                result = cloudinary.uploader.upload(
                    img_data,
                    folder=f"teleshop/products/{product.id}",
                    public_id=f"{product.slug}_primary",
                    resource_type="image",
                    overwrite=True,
                    format="png",
                    quality="auto:good"
                )
                
                # NOW we can safely access product.images
                existing_image = None
                for img in product.images:
                    if img.is_primary:
                        existing_image = img
                        break
                
                if existing_image:
                    existing_image.image_url = result['secure_url']
                    print("✅ (updated)")
                else:
                    new_image = ProductImage(
                        product_id=product.id,
                        image_url=result['secure_url'],
                        is_primary=True
                    )
                    db.add(new_image)
                    print("✅ (created)")
                
                success += 1
                
            except Exception as e:
                print(f"❌ {str(e)[:80]}")
                failed += 1
        
        await db.commit()
    
    print(f"\n📊 Products: {success} success, {failed} failed")
    print("\n✅ Done! Refresh your browser!\n")

if __name__ == "__main__":
    asyncio.run(fix_products())