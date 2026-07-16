# generate_professional_images.py
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
from app.utils import slugify
import random

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
        font_large = ImageFont.truetype(fp, 80)
        font_medium = ImageFont.truetype(fp, 36)
        font_small = ImageFont.truetype(fp, 22)
        font_price = ImageFont.truetype(fp, 48)
        print(f"✅ Using font: {fp}")
        break
    except:
        pass

if not font_large:
    font_large = font_medium = font_small = font_price = ImageFont.load_default()

# ============================================
# COLOR PALETTES
# ============================================
GRADIENTS = [
    (["#667eea", "#764ba2"], "📱"),   # Purple - Tech
    (["#f093fb", "#f5576c"], "💻"),   # Pink - Laptops
    (["#4facfe", "#00f2fe"], "🎧"),   # Blue - Audio
    (["#43e97b", "#38f9d7"], "📷"),   # Green - Cameras
    (["#fa709a", "#fee140"], "⌚"),    # Pink/Yellow - Watches
    (["#a18cd1", "#fbc2eb"], "🎮"),   # Lavender - Gaming
    (["#fad0c4", "#ffd1ff"], "👟"),   # Light Pink - Shoes
    (["#ffecd2", "#fcb69f"], "👗"),   # Peach - Fashion
    (["#ff9a9e", "#fecfef"], "👔"),   # Rose - Clothing
    (["#a1c4fd", "#c2e9fb"], "👜"),   # Light Blue - Bags
    (["#d4fc79", "#96e6a1"], "💄"),   # Green - Beauty
    (["#fddb92", "#d1fdff"], "🏠"),   # Warm - Home
    (["#89f7fe", "#66a6ff"], "🍳"),   # Blue - Kitchen
    (["#f6d365", "#fda085"], "⚽"),    # Orange - Sports
    (["#fdcbf1", "#e6dee9"], "📚"),   # Pink - Books
    (["#a6c0fe", "#f68084"], "🎸"),   # Blue/Red - Music
    (["#fbc2eb", "#a6c1ee"], "🚗"),   # Pink/Blue - Auto
    (["#ff758c", "#ff7eb3"], "🐾"),   # Pink - Pets
    (["#c471f5", "#fa71cd"], "💍"),   # Purple - Jewelry
    (["#48c6ef", "#6f86d6"], "🛒"),   # Blue - General
]

# ============================================
# CATEGORY-SPECIFIC DATA
# ============================================
CATEGORY_STYLES = {
    "electronics": ("#2563EB", "📱", "Electronics"),
    "fashion": ("#DB2777", "👗", "Fashion"),
    "home-garden": ("#16A34A", "🏡", "Home & Garden"),
    "sports-outdoors": ("#EA580C", "⚽", "Sports"),
    "sports": ("#EA580C", "🏆", "Sports"),
    "groceries-food": ("#84CC16", "🛒", "Groceries"),
    "medicine-pharmacy": ("#EF4444", "💊", "Pharmacy"),
    "garden-outdoor": ("#22C55E", "🌻", "Garden"),
    "crafts-diy": ("#F97316", "🎨", "Crafts"),
    "party-supplies": ("#EC4899", "🎉", "Party"),
    "travel-luggage": ("#0891B2", "✈️", "Travel"),
    "beauty-personal-care": ("#EC4899", "💄", "Beauty"),
    "books-stationery": ("#6366F1", "📚", "Books"),
    "toys-games": ("#F43F5E", "🧸", "Toys"),
    "automotive": ("#71717A", "🚗", "Auto"),
    "pet-supplies": ("#14B8A6", "🐾", "Pets"),
    "baby-products": ("#FDA4AF", "🍼", "Baby"),
    "health-wellness": ("#22C55E", "🏥", "Health"),
    "office-supplies": ("#64748B", "📎", "Office"),
    "musical-instruments": ("#A855F7", "🎸", "Music"),
    "food-beverages": ("#EAB308", "🍕", "Food"),
}

# ============================================
# PRODUCT ICONS BY KEYWORD
# ============================================
def get_product_icon(name):
    name_lower = name.lower()
    if 'iphone' in name_lower or 'phone' in name_lower or 'galaxy' in name_lower or 'pixel' in name_lower:
        return "📱"
    if 'macbook' in name_lower or 'laptop' in name_lower or 'dell' in name_lower or 'asus' in name_lower or 'thinkpad' in name_lower:
        return "💻"
    if 'airpod' in name_lower or 'headphone' in name_lower or 'earbud' in name_lower or 'sony' in name_lower or 'bose' in name_lower or 'beats' in name_lower:
        return "🎧"
    if 'speaker' in name_lower or 'jbl' in name_lower:
        return "🔊"
    if 'camera' in name_lower or 'sony alpha' in name_lower or 'gopro' in name_lower or 'dji' in name_lower:
        return "📷"
    if 'playstation' in name_lower or 'nintendo' in name_lower or 'xbox' in name_lower or 'gaming' in name_lower:
        return "🎮"
    if 'shoe' in name_lower or 'nike' in name_lower or 'adidas' in name_lower or 'sneaker' in name_lower:
        return "👟"
    if 'jean' in name_lower or 'pant' in name_lower or 'levi' in name_lower:
        return "👖"
    if 'legging' in name_lower or 'lululemon' in name_lower or 'yoga' in name_lower:
        return "🧘"
    if 'mixer' in name_lower or 'kitchen' in name_lower or 'kitchenaid' in name_lower or 'instant pot' in name_lower:
        return "🍳"
    if 'fitbit' in name_lower or 'watch' in name_lower or 'fitness' in name_lower or 'dumbbell' in name_lower or 'bowflex' in name_lower:
        return "💪"
    if 'philips' in name_lower or 'hue' in name_lower or 'light' in name_lower:
        return "💡"
    if 'dyson' in name_lower or 'vacuum' in name_lower:
        return "🧹"
    if 'tablet' in name_lower or 'ipad' in name_lower:
        return "📱"
    if 'printer' in name_lower or 'canon' in name_lower or 'hp' in name_lower:
        return "🖨️"
    if 'router' in name_lower or 'wifi' in name_lower or 'tp-link' in name_lower or 'netgear' in name_lower:
        return "🌐"
    if 'tea' in name_lower or 'coffee' in name_lower:
        return "☕"
    if 'vitamin' in name_lower or 'medicine' in name_lower or 'first aid' in name_lower:
        return "💊"
    if 'garden' in name_lower or 'plant' in name_lower or 'pot' in name_lower:
        return "🪴"
    if 'paint' in name_lower or 'knitting' in name_lower or 'craft' in name_lower:
        return "🎨"
    if 'balloon' in name_lower or 'party' in name_lower:
        return "🎈"
    if 'backpack' in name_lower or 'travel' in name_lower or 'packing' in name_lower:
        return "🎒"
    if 'sunglass' in name_lower or 'ray-ban' in name_lower or 'oakley' in name_lower:
        return "😎"
    if 'jacket' in name_lower or 'fleece' in name_lower or 'north face' in name_lower or 'columbia' in name_lower:
        return "🧥"
    return random.choice(["📦", "🏷️", "⭐", "🔥", "💎", "🎯", "✨"])

# ============================================
# IMAGE CREATORS
# ============================================
def create_gradient_bg(draw, w, h, color1, color2):
    """Draw gradient background"""
    for y in range(h):
        r = int(int(color1[1:3], 16) * (1 - y/h) + int(color2[1:3], 16) * (y/h))
        g = int(int(color1[3:5], 16) * (1 - y/h) + int(color2[3:5], 16) * (y/h))
        b = int(int(color1[5:7], 16) * (1 - y/h) + int(color2[5:7], 16) * (y/h))
        draw.line([(0, y), (w, y)], fill=(r, g, b))

def create_category_image(name, color_hex, icon):
    """Professional category image"""
    img = Image.new('RGB', (800, 500), color_hex)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Pattern overlay
    for i in range(0, 800, 60):
        draw.ellipse([i-200, -100, i-100, 0], fill=(255,255,255,8))
        draw.ellipse([i+100, 400, i+200, 500], fill=(255,255,255,8))
    
    # Bottom dark overlay
    for y in range(320, 500):
        alpha = min(int((y-320)*0.8), 160)
        draw.line([(0,y), (800,y)], fill=(0,0,0,alpha))
    
    # Large icon with shadow
    draw.text((403, 123), icon, fill=(0,0,0,40), font=font_large)  # Shadow
    bbox = draw.textbbox((0,0), icon, font=font_large)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, 120), icon, fill=(255,255,255,240), font=font_large)
    
    # Category name
    bbox = draw.textbbox((0,0), name, font=font_medium)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, 340), name, fill=(255,255,255,255), font=font_medium)
    
    # Item count
    count_text = "Browse Collection"
    bbox = draw.textbbox((0,0), count_text, font=font_small)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, 395), count_text, fill=(255,255,255,180), font=font_small)
    
    # "Shop Now" button style
    btn_text = "Shop Now →"
    bbox = draw.textbbox((0,0), btn_text, font=font_small)
    btn_w = bbox[2]-bbox[0] + 40
    btn_x = (800-btn_w)/2
    btn_y = 435
    draw.rounded_rectangle([btn_x, btn_y, btn_x+btn_w, btn_y+35], radius=18, fill=(255,255,255,200))
    draw.text((btn_x+20, btn_y+5), btn_text, fill=color_hex, font=font_small)
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def create_product_image(name, color_hex, icon):
    """Professional product image"""
    img = Image.new('RGB', (800, 800), color_hex)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Decorative circles
    draw.ellipse([-100, -100, 200, 200], fill=(255,255,255,10))
    draw.ellipse([600, 600, 900, 900], fill=(255,255,255,8))
    draw.ellipse([600, -50, 850, 200], fill=(255,255,255,6))
    
    # Bottom dark overlay
    for y in range(550, 800):
        alpha = min(int((y-550)*0.9), 180)
        draw.line([(0,y), (800,y)], fill=(0,0,0,alpha))
    
    # Brand badge
    brand_text = "PREMIUM"
    bbox = draw.textbbox((0,0), brand_text, font=font_small)
    bw = bbox[2]-bbox[0] + 20
    draw.rounded_rectangle([20, 20, 20+bw, 45], radius=10, fill=(255,255,255,180))
    draw.text((30, 23), brand_text, fill=color_hex, font=font_small)
    
    # Large icon
    draw.text((403, 253), icon, fill=(0,0,0,30), font=font_large)  # Shadow
    bbox = draw.textbbox((0,0), icon, font=font_large)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, 250), icon, fill=(255,255,255,250), font=font_large)
    
    # Product name (wrapped)
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
    
    y_pos = 500
    for line in lines:
        bbox = draw.textbbox((0,0), line, font=font_small)
        w = bbox[2]-bbox[0]
        draw.text(((800-w)/2, y_pos), line, fill=(255,255,255,240), font=font_small)
        y_pos += 30
    
    # Price tag
    price_text = "Best Price Guaranteed"
    bbox = draw.textbbox((0,0), price_text, font=font_small)
    w = bbox[2]-bbox[0]
    draw.text(((800-w)/2, y_pos+10), price_text, fill=(255,255,255,160), font=font_small)
    
    # Add to Cart button
    btn_text = "🛒 Add to Cart"
    bbox = draw.textbbox((0,0), btn_text, font=font_small)
    btn_w = bbox[2]-bbox[0] + 60
    btn_x = (800-btn_w)/2
    btn_y = y_pos + 55
    draw.rounded_rectangle([btn_x, btn_y, btn_x+btn_w, btn_y+40], radius=20, fill=(255,255,255,220))
    draw.text((btn_x+30, btn_y+8), btn_text, fill=color_hex, font=font_small)
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

# ============================================
# MAIN
# ============================================
async def main():
    print("\n" + "="*60)
    print("🎨 GENERATING PROFESSIONAL IMAGES")
    print("="*60)
    
    async with async_session() as db:
        
        # ===== CATEGORIES =====
        print("\n📁 CATEGORIES:\n")
        result = await db.execute(select(Category))
        categories = result.scalars().all()
        
        for cat in categories:
            try:
                # Get style or use default
                style = CATEGORY_STYLES.get(cat.slug, ("#6366F1", "📦", cat.name))
                color, icon, _ = style
                
                print(f"  🎨 {cat.name}...", end=" ")
                
                img_data = create_category_image(cat.name, color, icon)
                
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
        
        for i, product in enumerate(products):
            try:
                # Get gradient colors and icon
                gradient = GRADIENTS[i % len(GRADIENTS)]
                color1, color2 = gradient[0]
                icon = get_product_icon(product.name)
                
                print(f"  📦 {product.name[:40]}...", end=" ")
                
                # Create image with gradient
                img = Image.new('RGB', (800, 800), color1)
                draw = ImageDraw.Draw(img, 'RGBA')
                create_gradient_bg(draw, 800, 800, color1, color2)
                
                img_data = create_product_image(product.name, color1, icon)
                
                # Upload
                upload_result = cloudinary.uploader.upload(
                    img_data,
                    folder=f"teleshop/products/{product.id}",
                    public_id=f"{product.slug}_primary",
                    resource_type="image",
                    overwrite=True,
                    format="png"
                )
                
                # Update/create product image
                existing_img = None
                for img_obj in product.images:
                    if img_obj.is_primary:
                        existing_img = img_obj
                        break
                
                if existing_img:
                    existing_img.image_url = upload_result['secure_url']
                    print("✅ (updated)")
                else:
                    new_img = ProductImage(
                        product_id=product.id,
                        image_url=upload_result['secure_url'],
                        is_primary=True
                    )
                    db.add(new_img)
                    print("✅ (new)")
                    
            except Exception as e:
                print(f"❌ {str(e)[:50]}")
        
        await db.commit()
    
    print("\n" + "="*60)
    print("🎉 ALL IMAGES GENERATED!")
    print("🔄 Refresh your browser: http://localhost:5173")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())