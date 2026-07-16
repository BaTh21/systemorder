# create_100_products.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
from PIL import Image, ImageDraw, ImageFont
import io
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from app.models.category import Category
from app.models.product import Product, ProductImage
from app.utils import slugify
import requests
import random

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# ============================================
# 100 REAL PRODUCTS WITH REAL IMAGES
# Using Picsum.photos for real-looking images
# ============================================
PRODUCTS = [
    # 📱 Smartphones (1-10)
    ("iPhone 15 Pro Max 256GB", "Apple iPhone 15 Pro Max with 256GB storage, Titanium design, A17 Pro chip", 1199.99, 25, "electronics", "Apple"),
    ("iPhone 15 Pro 128GB", "Apple iPhone 15 Pro 128GB, 6.1-inch display", 999.99, 30, "electronics", "Apple"),
    ("iPhone 15 256GB", "Apple iPhone 15 with 256GB, 48MP camera", 899.99, 40, "electronics", "Apple"),
    ("Samsung Galaxy S24 Ultra", "Samsung S24 Ultra with S Pen, 200MP camera", 1299.99, 20, "electronics", "Samsung"),
    ("Samsung Galaxy S24+", "Samsung Galaxy S24+ 512GB, AI features", 999.99, 25, "electronics", "Samsung"),
    ("Samsung Galaxy Z Fold 5", "Samsung foldable phone 7.6-inch display", 1799.99, 10, "electronics", "Samsung"),
    ("Google Pixel 8 Pro", "Google Pixel 8 Pro with AI camera", 999.99, 20, "electronics", "Google"),
    ("OnePlus 12", "OnePlus 12 5G 16GB RAM 256GB", 799.99, 25, "electronics", "OnePlus"),
    ("Xiaomi 14 Pro", "Xiaomi 14 Pro Leica camera", 899.99, 15, "electronics", "Xiaomi"),
    ("Nothing Phone 2", "Nothing Phone 2 512GB transparent design", 699.99, 30, "electronics", "Nothing"),
    
    # 💻 Laptops (11-20)
    ("MacBook Pro 16 M3 Max", "Apple MacBook Pro 16-inch M3 Max chip 32GB RAM", 3499.99, 10, "electronics", "Apple"),
    ("MacBook Air 15 M3", "Apple MacBook Air 15-inch M3 chip 16GB", 1499.99, 15, "electronics", "Apple"),
    ("MacBook Pro 14 M3 Pro", "Apple MacBook Pro 14 M3 Pro 18GB", 1999.99, 12, "electronics", "Apple"),
    ("Dell XPS 15 OLED", "Dell XPS 15 Intel i7 13th Gen 16GB 512GB SSD", 1799.99, 8, "electronics", "Dell"),
    ("Dell XPS 13 Plus", "Dell XPS 13 Plus i7 512GB", 1499.99, 10, "electronics", "Dell"),
    ("HP Spectre x360 14", "HP Spectre x360 2-in-1 OLED", 1699.99, 7, "electronics", "HP"),
    ("Lenovo ThinkPad X1 Carbon", "Lenovo ThinkPad X1 Gen 11 i7 1TB", 1899.99, 10, "electronics", "Lenovo"),
    ("ASUS ROG Zephyrus G14", "ASUS ROG gaming laptop Ryzen 9 RTX 4070", 1999.99, 8, "electronics", "ASUS"),
    ("Acer Predator Helios 16", "Acer gaming laptop i9 RTX 4080", 2499.99, 5, "electronics", "Acer"),
    ("Microsoft Surface Laptop 5", "Microsoft Surface Laptop 5 i7 16GB", 1699.99, 10, "electronics", "Microsoft"),
    
    # 🎧 Audio (21-30)
    ("AirPods Pro 2nd Gen", "Apple AirPods Pro 2 USB-C ANC", 249.99, 50, "electronics", "Apple"),
    ("AirPods Max", "Apple AirPods Max over-ear headphones", 549.99, 15, "electronics", "Apple"),
    ("Sony WH-1000XM5", "Sony noise cancelling headphones 30hr battery", 399.99, 25, "electronics", "Sony"),
    ("Bose QuietComfort Ultra", "Bose QC Ultra spatial audio ANC", 429.99, 20, "electronics", "Bose"),
    ("Sennheiser Momentum 4", "Sennheiser wireless headphones 60hr", 349.99, 18, "electronics", "Sennheiser"),
    ("JBL Flip 6", "JBL Flip 6 portable Bluetooth speaker", 129.99, 40, "electronics", "JBL"),
    ("JBL Charge 5", "JBL Charge 5 waterproof speaker powerbank", 179.99, 30, "electronics", "JBL"),
    ("Marshall Stanmore III", "Marshall Stanmore III Bluetooth speaker", 379.99, 12, "electronics", "Marshall"),
    ("Sonos Era 300", "Sonos Era 300 spatial audio speaker", 449.99, 10, "electronics", "Sonos"),
    ("Beats Studio Pro", "Beats Studio Pro wireless ANC headphones", 349.99, 20, "electronics", "Beats"),
    
    # 📷 Cameras (31-35)
    ("Sony Alpha 7 IV", "Sony A7 IV full-frame mirrorless camera", 2499.99, 8, "electronics", "Sony"),
    ("Canon EOS R6 Mark II", "Canon EOS R6 II full-frame camera", 2499.99, 6, "electronics", "Canon"),
    ("DJI Mini 4 Pro", "DJI Mini 4 Pro drone 4K camera", 799.99, 12, "electronics", "DJI"),
    ("GoPro Hero 12 Black", "GoPro Hero 12 action camera 5.3K video", 399.99, 15, "electronics", "GoPro"),
    ("Insta360 X3", "Insta360 X3 360-degree action camera", 449.99, 10, "electronics", "Insta360"),
    
    # 🎮 Gaming (36-40)
    ("PlayStation 5 Slim", "Sony PS5 Slim console 1TB SSD", 499.99, 20, "electronics", "Sony"),
    ("Xbox Series X", "Microsoft Xbox Series X 1TB console", 499.99, 15, "electronics", "Microsoft"),
    ("Nintendo Switch OLED", "Nintendo Switch OLED model 64GB", 349.99, 25, "electronics", "Nintendo"),
    ("Steam Deck OLED", "Valve Steam Deck OLED 1TB handheld", 649.99, 10, "electronics", "Valve"),
    ("ASUS ROG Ally", "ASUS ROG Ally handheld gaming Z1 Extreme", 699.99, 8, "electronics", "ASUS"),
    
    # 👟 Fashion - Shoes (41-50)
    ("Nike Air Max 270 React", "Nike Air Max 270 React casual sneakers", 149.99, 40, "fashion", "Nike"),
    ("Nike Air Force 1", "Nike Air Force 1 classic white", 119.99, 50, "fashion", "Nike"),
    ("Adidas Ultraboost 23", "Adidas Ultraboost 23 running shoes", 189.99, 30, "fashion", "Adidas"),
    ("Adidas Samba OG", "Adidas Samba OG classic sneakers", 99.99, 45, "fashion", "Adidas"),
    ("New Balance 550", "New Balance 550 basketball sneakers", 129.99, 35, "fashion", "New Balance"),
    ("Converse Chuck Taylor", "Converse Chuck Taylor high top", 69.99, 60, "fashion", "Converse"),
    ("Vans Old Skool", "Vans Old Skool skate shoes", 74.99, 50, "fashion", "Vans"),
    ("Puma RS-X", "Puma RS-X retro sneakers", 109.99, 40, "fashion", "Puma"),
    ("Reebok Club C 85", "Reebok Club C 85 vintage shoes", 89.99, 35, "fashion", "Reebok"),
    ("Crocs Classic Clog", "Crocs classic clog comfort shoes", 49.99, 80, "fashion", "Crocs"),
    
    # 👗 Fashion - Clothing (51-60)
    ("Levi's 501 Original Jeans", "Levi's 501 original fit jeans", 69.99, 50, "fashion", "Levi's"),
    ("Nike Dri-FIT T-Shirt", "Nike Dri-FIT training t-shirt", 34.99, 70, "fashion", "Nike"),
    ("Adidas Hoodie", "Adidas Essentials fleece hoodie", 59.99, 45, "fashion", "Adidas"),
    ("Tommy Hilfiger Polo", "Tommy Hilfiger classic polo shirt", 79.99, 30, "fashion", "Tommy Hilfiger"),
    ("Calvin Klein Boxers 3-Pack", "Calvin Klein cotton boxers 3-pack", 44.99, 60, "fashion", "Calvin Klein"),
    ("Patagonia Better Sweater", "Patagonia fleece jacket", 139.99, 20, "fashion", "Patagonia"),
    ("The North Face Jacket", "North Face waterproof winter jacket", 299.99, 15, "fashion", "North Face"),
    ("Lululemon Align Leggings", "Lululemon Align high-rise leggings", 98.99, 25, "fashion", "Lululemon"),
    ("Zara Blazer", "Zara slim fit blazer jacket", 89.99, 20, "fashion", "Zara"),
    ("H&M Denim Jacket", "H&M classic denim jacket", 49.99, 35, "fashion", "H&M"),
    
    # ⌚ Watches (61-65)
    ("Apple Watch Series 9", "Apple Watch Series 9 GPS 45mm", 429.99, 25, "electronics", "Apple"),
    ("Samsung Galaxy Watch 6", "Samsung Galaxy Watch 6 Classic 47mm", 399.99, 20, "electronics", "Samsung"),
    ("Garmin Fenix 7", "Garmin Fenix 7 multisport GPS watch", 699.99, 10, "electronics", "Garmin"),
    ("Casio G-Shock", "Casio G-Shock digital watch", 99.99, 40, "fashion", "Casio"),
    ("Fossil Grant Chronograph", "Fossil Grant chronograph leather watch", 149.99, 15, "fashion", "Fossil"),
    
    # 🏠 Home & Kitchen (66-75)
    ("KitchenAid Artisan Mixer", "KitchenAid Artisan stand mixer 5-quart", 449.99, 12, "home-garden", "KitchenAid"),
    ("Instant Pot Duo Plus", "Instant Pot Duo Plus 6-quart 9-in-1", 89.99, 30, "home-garden", "Instant Pot"),
    ("Dyson V15 Detect", "Dyson V15 cordless vacuum laser", 749.99, 8, "home-garden", "Dyson"),
    ("iRobot Roomba j7+", "iRobot Roomba j7+ robot vacuum", 599.99, 10, "home-garden", "iRobot"),
    ("Philips Hue Starter Kit", "Philips Hue smart lights starter kit", 199.99, 20, "home-garden", "Philips"),
    ("Nespresso Vertuo Next", "Nespresso Vertuo coffee machine", 179.99, 25, "home-garden", "Nespresso"),
    ("Vitamix E310 Blender", "Vitamix E310 professional blender", 349.99, 10, "home-garden", "Vitamix"),
    ("Le Creuset Dutch Oven", "Le Creuset cast iron dutch oven", 399.99, 8, "home-garden", "Le Creuset"),
    ("Shark AI Robot Vacuum", "Shark AI robot vacuum with base", 449.99, 12, "home-garden", "Shark"),
    ("Ninja Air Fryer Max", "Ninja Air Fryer Max XL 5.5-quart", 129.99, 35, "home-garden", "Ninja"),
    
    # 💪 Fitness (76-80)
    ("Fitbit Charge 6", "Fitbit Charge 6 fitness tracker", 159.99, 30, "sports-outdoors", "Fitbit"),
    ("Bowflex Dumbbells 552", "Bowflex SelectTech 552 adjustable dumbbells", 429.99, 8, "sports-outdoors", "Bowflex"),
    ("Peloton Bike", "Peloton indoor exercise bike", 1445.99, 3, "sports-outdoors", "Peloton"),
    ("Manduka Yoga Mat Pro", "Manduka PRO yoga mat 6mm", 129.99, 25, "sports-outdoors", "Manduka"),
    ("Hydro Flask 32oz", "Hydro Flask wide mouth water bottle", 44.99, 50, "sports-outdoors", "Hydro Flask"),
    
    # 🧴 Beauty (81-85)
    ("Dyson Airwrap", "Dyson Airwrap multi-styler complete", 599.99, 10, "beauty-personal-care", "Dyson"),
    ("Olaplex No.3 Treatment", "Olaplex No.3 hair perfector 100ml", 28.99, 60, "beauty-personal-care", "Olaplex"),
    ("La Mer Moisturizer", "La Mer Crème de la Mer 60ml", 380.99, 5, "beauty-personal-care", "La Mer"),
    ("Tom Ford Oud Wood", "Tom Ford Oud Wood EDP 50ml", 295.99, 8, "beauty-personal-care", "Tom Ford"),
    ("Philips Sonicare 9900", "Philips Sonicare Prestige electric toothbrush", 329.99, 15, "beauty-personal-care", "Philips"),
    
    # 🐾 Pet Supplies (86-90)
    ("Furbo Dog Camera", "Furbo 360 dog camera with treat tosser", 199.99, 15, "pet-supplies", "Furbo"),
    ("PetSafe Automatic Feeder", "PetSafe automatic pet feeder WiFi", 149.99, 12, "pet-supplies", "PetSafe"),
    ("Kong Classic Dog Toy", "Kong classic dog toy large", 14.99, 80, "pet-supplies", "Kong"),
    ("Purina Pro Plan 30lb", "Purina Pro Plan dog food chicken", 49.99, 40, "pet-supplies", "Purina"),
    ("Cat Tree Tower 72\"", "Cat tree tower with scratching posts", 89.99, 10, "pet-supplies", "AmazonBasics"),
    
    # 🚗 Automotive (91-95)
    ("Garmin Dash Cam Mini 2", "Garmin dash cam mini 2 HD", 129.99, 20, "automotive", "Garmin"),
    ("Chemical Guys Car Wash Kit", "Chemical Guys 16-piece car wash kit", 89.99, 15, "automotive", "Chemical Guys"),
    ("NOCO Jump Starter GB40", "NOCO Boost Plus jump starter 1000A", 99.99, 25, "automotive", "NOCO"),
    ("Turtle Wax Ceramic Spray", "Turtle Wax ceramic spray coating", 24.99, 50, "automotive", "Turtle Wax"),
    ("WeatherTech Floor Mats", "WeatherTech custom floor mats full set", 179.99, 12, "automotive", "WeatherTech"),
    
    # 📚 Books & Office (96-100)
    ("Kindle Paperwhite 2024", "Amazon Kindle Paperwhite 16GB ad-free", 149.99, 30, "books-stationery", "Amazon"),
    ("Moleskine Notebook Set", "Moleskine classic notebook 3-pack", 34.99, 45, "books-stationery", "Moleskine"),
    ("Herman Miller Aeron Chair", "Herman Miller Aeron ergonomic chair", 1395.99, 4, "office-supplies", "Herman Miller"),
    ("Fujifilm Instax Mini 12", "Fujifilm Instax Mini 12 instant camera", 79.99, 20, "electronics", "Fujifilm"),
    ("LEGO Star Wars Set", "LEGO Star Wars Millennium Falcon 7541pc", 849.99, 5, "toys-games", "LEGO"),
]

# ============================================
# REAL IMAGE DOWNLOAD FUNCTION
# Using picsum.photos for real-looking images
# ============================================
def get_product_image(index):
    """Get a real-looking image from picsum"""
    # Use different images based on index
    image_id = (index % 200) + 1  # Picsum has about 200 images
    urls = [
        f"https://picsum.photos/id/{image_id}/800/800",
        f"https://picsum.photos/seed/product{index}/800/800",
    ]
    
    for url in urls:
        try:
            resp = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            if resp.status_code == 200 and len(resp.content) > 1000:
                return io.BytesIO(resp.content)
        except:
            continue
    return None

def get_category_image(slug, index):
    """Get category image"""
    image_id = (index % 200) + 50
    try:
        resp = requests.get(f"https://picsum.photos/id/{image_id}/800/500", timeout=10)
        if resp.status_code == 200 and len(resp.content) > 1000:
            return io.BytesIO(resp.content)
    except:
        pass
    return None

async def main():
    print("\n" + "="*60)
    print("🚀 CREATING 100 PRODUCTS WITH REAL IMAGES")
    print("="*60)
    
    async with async_session() as db:
        
        # Get categories
        result = await db.execute(select(Category))
        categories = {cat.slug: cat for cat in result.scalars().all()}
        print(f"\n📁 Found {len(categories)} categories")
        
        # Update category images
        print("\n📁 Updating category images...")
        for i, (slug, cat) in enumerate(categories.items()):
            img_data = get_category_image(slug, i)
            if img_data:
                cloudinary.uploader.upload(
                    img_data,
                    folder="teleshop/categories",
                    public_id=slug,
                    resource_type="image",
                    overwrite=True,
                    format="jpg"
                )
                cat.image_url = f"https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/{slug}"
                print(f"  ✅ {cat.name}")
        
        await db.commit()
        
        # Add products
        print(f"\n📦 Creating 100 products...\n")
        count = 0
        skip = 0
        
        for i, (name, desc, price, stock, cat_slug, supplier) in enumerate(PRODUCTS):
            slug = slugify(name)
            
            # Check if exists
            result = await db.execute(select(Product).where(Product.slug == slug))
            if result.scalars().first():
                print(f"  ⏭️  Already exists: {name[:50]}")
                skip += 1
                continue
            
            # Get category
            category = categories.get(cat_slug)
            if not category:
                print(f"  ⚠️  Category '{cat_slug}' not found")
                continue
            
            print(f"  📦 {name[:50]}...", end=" ")
            
            # Get real image
            img_data = get_product_image(i)
            
            if img_data:
                upload_result = cloudinary.uploader.upload(
                    img_data,
                    folder=f"teleshop/products/{slug}",
                    public_id=f"{slug}_primary",
                    resource_type="image",
                    overwrite=True,
                    format="jpg"
                )
                image_url = upload_result['secure_url']
            else:
                image_url = None
                print("⚠️ No image", end=" ")
            
            # Create product
            product = Product(
                name=name,
                slug=slug,
                description=desc,
                base_price=price,
                stock=stock,
                category_id=category.id,
                supplier=supplier,
                is_active=True,
                discount_percent=random.choice([0, 0, 0, 5, 10, 15, 20, 25])
            )
            db.add(product)
            await db.flush()
            
            if image_url:
                prod_img = ProductImage(
                    product_id=product.id,
                    image_url=image_url,
                    is_primary=True
                )
                db.add(prod_img)
                print("✅")
            else:
                print("✅ (no img)")
            
            count += 1
        
        await db.commit()
    
    print(f"\n" + "="*60)
    print(f"📊 RESULTS:")
    print(f"   New products: {count}")
    print(f"   Skipped: {skip}")
    print(f"   Total products: {count + skip}")
    print("="*60)
    print("\n🎉 100 PRODUCTS CREATED!")
    print("🔄 Refresh: http://localhost:5173/products")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        import requests
    except:
        import subprocess
        subprocess.run(["pip", "install", "requests"], check=True)
        import requests
    
    asyncio.run(main())