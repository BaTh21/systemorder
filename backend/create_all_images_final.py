# create_all_images_final.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from PIL import Image, ImageDraw, ImageFont
import io
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.category import Category
from app.models.product import Product, ProductImage

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# ============================================
# FONTS
# ============================================
font_large = None
font_medium = None
font_small = None
font_price = None

for fp in ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/Arial.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
    try:
        font_large = ImageFont.truetype(fp, 90)
        font_medium = ImageFont.truetype(fp, 38)
        font_small = ImageFont.truetype(fp, 24)
        font_price = ImageFont.truetype(fp, 50)
        print(f"✅ Font: {fp}")
        break
    except:
        pass

if not font_large:
    font_large = font_medium = font_small = font_price = ImageFont.load_default()

# ============================================
# PRODUCT DATA WITH SPECIFIC ICONS & COLORS
# ============================================
PRODUCT_STYLES = {
    "iphone-15-pro-max": ("iPhone 15 Pro Max", "📱", "#1a1a2e", "#16213e"),
    "samsung-galaxy-s24-ultra": ("Samsung Galaxy S24", "📱", "#0f0c29", "#302b63"),
    "google-pixel-8-pro": ("Google Pixel 8 Pro", "📱", "#4a00e0", "#8e2de2"),
    "macbook-pro-16-m3-max": ("MacBook Pro 16", "💻", "#1a1a2e", "#2d3436"),
    "dell-xps-15": ("Dell XPS 15", "💻", "#0c0c0c", "#434343"),
    "asus-rog-zephyrus-g14": ("ASUS ROG G14", "💻", "#ff0000", "#200000"),
    "airpods-pro-2nd-generation": ("AirPods Pro 2", "🎧", "#ffffff", "#f0f0f0"),
    "sony-wh-1000xm5": ("Sony WH-1000XM5", "🎧", "#1a1a2e", "#3a3a5e"),
    "jbl-flip-6": ("JBL Flip 6", "🔊", "#ff4b2b", "#ff416c"),
    "sony-alpha-7-iv": ("Sony Alpha 7 IV", "📷", "#1a1a2e", "#2d3436"),
    "dji-mini-4-pro": ("DJI Mini 4 Pro", "🛸", "#1a1a2e", "#16213e"),
    "gopro-hero-12-black": ("GoPro Hero 12", "📸", "#000000", "#1a1a1a"),
    "playstation-5-slim": ("PlayStation 5", "🎮", "#003087", "#0070cc"),
    "nintendo-switch-oled": ("Nintendo Switch", "🎮", "#e60012", "#ff4444"),
    "nike-air-max-270-react": ("Nike Air Max 270", "👟", "#ff4b2b", "#ff6b4b"),
    "levis-501-original-fit-jeans": ("Levi's 501 Jeans", "👖", "#1a3a5c", "#2a5a8c"),
    "lululemon-align-high-rise-leggings": ("Lululemon Leggings", "👚", "#2d1b4e", "#5a2d8c"),
    "kitchenaid-artisan-stand-mixer": ("KitchenAid Mixer", "🍳", "#e74c3c", "#c0392b"),
    "instant-pot-duo-plus-9-in-1": ("Instant Pot Duo", "🍲", "#2c3e50", "#34495e"),
    "fitbit-charge-6": ("Fitbit Charge 6", "⌚", "#000000", "#1a1a2e"),
    "bowflex-selecttech-552-dumbbells": ("Bowflex Dumbbells", "💪", "#ff4b2b", "#1a1a1a"),
    "philips-hue-white-color-starter-kit": ("Philips Hue", "💡", "#6c5ce7", "#a29bfe"),
    "dyson-v15-detect-cordless-vacuum": ("Dyson V15", "🧹", "#6c5ce7", "#a29bfe"),
}

# ============================================
# CATEGORY DATA
# ============================================
CATEGORY_STYLES = {
    "electronics": ("Electronics", "📱", "#2563EB", "#1D4ED8"),
    "fashion": ("Fashion", "👗", "#DB2777", "#BE185D"),
    "home-garden": ("Home & Garden", "🏡", "#16A34A", "#15803D"),
    "sports-outdoors": ("Sports & Outdoors", "⚽", "#EA580C", "#C2410C"),
    "sports": ("Sports", "🏆", "#EA580C", "#C2410C"),
    "groceries-food": ("Groceries", "🛒", "#84CC16", "#65A30D"),
    "medicine-pharmacy": ("Pharmacy", "💊", "#EF4444", "#DC2626"),
    "garden-outdoor": ("Garden", "🌻", "#22C55E", "#16A34A"),
    "crafts-diy": ("Crafts & DIY", "🎨", "#F97316", "#EA580C"),
    "party-supplies": ("Party", "🎉", "#EC4899", "#DB2777"),
    "travel-luggage": ("Travel", "✈️", "#0891B2", "#0E7490"),
    "beauty-personal-care": ("Beauty", "💄", "#EC4899", "#DB2777"),
    "books-stationery": ("Books", "📚", "#6366F1", "#4F46E5"),
    "toys-games": ("Toys & Games", "🧸", "#F43F5E", "#E11D48"),
    "automotive": ("Automotive", "🚗", "#71717A", "#52525B"),
    "pet-supplies": ("Pet Supplies", "🐾", "#14B8A6", "#0D9488"),
    "baby-products": ("Baby", "🍼", "#FDA4AF", "#FB7185"),
    "health-wellness": ("Health", "🏥", "#22C55E", "#16A34A"),
    "office-supplies": ("Office", "📎", "#64748B", "#475569"),
    "musical-instruments": ("Music", "🎸", "#A855F7", "#9333EA"),
    "food-beverages": ("Food & Drinks", "🍕", "#EAB308", "#CA8A04"),
}

# ============================================
# IMAGE CREATORS
# ============================================
def create_category_image(name, color1, color2, icon):
    """Create professional category banner"""
    img = Image.new('RGB', (800, 500), color1)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Gradient overlay
    for y in range(500):
        r1, g1, b1 = int(color1[1:3],16), int(color1[3:5],16), int(color1[5:7],16)
        r2, g2, b2 = int(color2[1:3],16), int(color2[3:5],16), int(color2[5:7],16)
        r = int(r1 + (r2-r1) * y/500)
        g = int(g1 + (g2-g1) * y/500)
        b = int(b1 + (b2-b1) * y/500)
        draw.line([(0,y), (800,y)], fill=(r,g,b))
    
    # Decorative circles
    for i in range(5):
        x = 100 + i * 150
        draw.ellipse([x-80, -80, x+80, 80], fill=(255,255,255,8))
    
    # Icon with shadow
    draw.text((402, 162), icon, fill=(0,0,0,50), font=font_large)
    bbox = draw.textbbox((0,0), icon, font=font_large)
    w = bbox[2] - bbox[0]
    draw.text(((800-w)/2, 160), icon, fill=(255,255,255,250), font=font_large)
    
    # Name
    bbox = draw.textbbox((0,0), name, font=font_medium)
    w = bbox[2] - bbox[0]
    draw.text(((800-w)/2, 320), name, fill=(255,255,255,255), font=font_medium)
    
    # Subtitle
    sub = "Shop Now →"
    bbox = draw.textbbox((0,0), sub, font=font_small)
    w = bbox[2] - bbox[0]
    # Button background
    btn_w = w + 40
    btn_x = (800 - btn_w) / 2
    draw.rounded_rectangle([btn_x, 380, btn_x+btn_w, 420], radius=20, fill=(255,255,255,200))
    draw.text((btn_x+20, 385), sub, fill=color1, font=font_small)
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def create_product_image(name, color1, color2, icon):
    """Create professional product image"""
    img = Image.new('RGB', (800, 800), color1)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Gradient
    for y in range(800):
        r1, g1, b1 = int(color1[1:3],16), int(color1[3:5],16), int(color1[5:7],16)
        r2, g2, b2 = int(color2[1:3],16), int(color2[3:5],16), int(color2[5:7],16)
        r = int(r1 + (r2-r1) * y/800)
        g = int(g1 + (g2-g1) * y/800)
        b = int(b1 + (b2-b1) * y/800)
        draw.line([(0,y), (800,y)], fill=(r,g,b))
    
    # Decorative elements
    draw.ellipse([-100, -100, 250, 250], fill=(255,255,255,10))
    draw.ellipse([550, 550, 900, 900], fill=(255,255,255,8))
    
    # Badge
    badge = "PREMIUM"
    bbox = draw.textbbox((0,0), badge, font=font_small)
    bw = bbox[2]-bbox[0] + 20
    draw.rounded_rectangle([30, 30, 30+bw, 55], radius=10, fill=(255,255,255,200))
    draw.text((40, 32), badge, fill=color1, font=font_small)
    
    # Icon with shadow
    draw.text((402, 282), icon, fill=(0,0,0,40), font=font_large)
    bbox = draw.textbbox((0,0), icon, font=font_large)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, 280), icon, fill=(255,255,255,250), font=font_large)
    
    # Product name
    words = name.split()
    lines = []
    cur = []
    for word in words:
        cur.append(word)
        if draw.textbbox((0,0), ' '.join(cur), font=font_small)[2] > 650:
            cur.pop()
            lines.append(' '.join(cur))
            cur = [word]
    lines.append(' '.join(cur))
    
    y_pos = 480
    for line in lines:
        bbox = draw.textbbox((0,0), line, font=font_small)
        w = bbox[2]-bbox[0]
        draw.text(((800-w)/2, y_pos), line, fill=(255,255,255,240), font=font_small)
        y_pos += 30
    
    # Price text
    price = "Best Price Guaranteed"
    bbox = draw.textbbox((0,0), price, font=font_small)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, y_pos+15), price, fill=(255,255,255,150), font=font_small)
    
    # Add to Cart button
    btn = "🛒 Add to Cart"
    bbox = draw.textbbox((0,0), btn, font=font_small)
    bw = bbox[2]-bbox[0] + 60
    bx = (800-bw)/2
    draw.rounded_rectangle([bx, y_pos+60, bx+bw, y_pos+100], radius=20, fill=(255,255,255,220))
    draw.text((bx+30, y_pos+65), btn, fill=color1, font=font_small)
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

# ============================================
# MAIN
# ============================================
async def main():
    print("\n" + "="*60)
    print("🎨 CREATING ALL IMAGES (NO DOWNLOADS)")
    print("="*60)
    
    async with async_session() as db:
        
        # ===== CATEGORIES =====
        print("\n📁 CATEGORIES:\n")
        result = await db.execute(select(Category))
        categories = result.scalars().all()
        
        for cat in categories:
            try:
                style = CATEGORY_STYLES.get(cat.slug)
                if not style:
                    print(f"  ⏭️  {cat.name} - No style defined")
                    continue
                
                name, icon, color1, color2 = style
                print(f"  🎨 {name}...", end=" ")
                
                img_data = create_category_image(name, color1, color2, icon)
                
                cloudinary.uploader.upload(
                    img_data,
                    folder="teleshop/categories",
                    public_id=cat.slug,
                    resource_type="image",
                    overwrite=True,
                    format="png"
                )
                
                cat.image_url = f"https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/{cat.slug}"
                print("✅")
                
            except Exception as e:
                print(f"❌ {str(e)[:50]}")
        
        await db.commit()
        
        # ===== PRODUCTS =====
        print("\n📦 PRODUCTS:\n")
        
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.images))
            .where(Product.is_active == True)
        )
        products = result.unique().scalars().all()
        
        for product in products:
            try:
                style = PRODUCT_STYLES.get(product.slug)
                if not style:
                    # Use defaults based on category
                    colors = ["#3B82F6", "#1D4ED8"]
                    icon = "📦"
                    name = product.name
                else:
                    name, icon, color1, color2 = style
                    colors = [color1, color2]
                
                print(f"  📦 {product.name[:45]}...", end=" ")
                
                img_data = create_product_image(name, colors[0], colors[1], icon)
                
                upload_result = cloudinary.uploader.upload(
                    img_data,
                    folder=f"teleshop/products/{product.id}",
                    public_id=f"{product.slug}_primary",
                    resource_type="image",
                    overwrite=True,
                    format="png"
                )
                
                existing = None
                for img in product.images:
                    if img.is_primary:
                        existing = img
                        break
                
                if existing:
                    existing.image_url = upload_result['secure_url']
                    print("✅")
                else:
                    new_img = ProductImage(
                        product_id=product.id,
                        image_url=upload_result['secure_url'],
                        is_primary=True
                    )
                    db.add(new_img)
                    print("✅")
                    
            except Exception as e:
                print(f"❌ {str(e)[:50]}")
        
        await db.commit()
    
    print("\n" + "="*60)
    print("🎉 ALL IMAGES CREATED SUCCESSFULLY!")
    print("🔄 Refresh: http://localhost:5173")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())