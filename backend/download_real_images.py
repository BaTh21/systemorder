# download_real_images.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings
import asyncio
from app.core.database import async_session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.product import Product, ProductImage
from app.models.category import Category
import requests
import io

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# ============================================
# REAL PRODUCT IMAGE URLS (Unsplash - Free)
# ============================================
PRODUCT_IMAGES = {
    # Smartphones
    "iphone-15-pro-max": [
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",  # iPhone 15
        "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800",  # iPhone
    ],
    "samsung-galaxy-s24-ultra": [
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",  # Samsung
        "https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=800",  # Phone
    ],
    "google-pixel-8-pro": [
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",  # Pixel
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",  # Phone
    ],
    
    # Laptops
    "macbook-pro-16-m3-max": [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",  # MacBook
        "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800",  # MacBook
    ],
    "dell-xps-15": [
        "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800",  # Dell Laptop
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",  # Laptop
    ],
    "asus-rog-zephyrus-g14": [
        "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",  # Gaming Laptop
        "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800",  # Laptop
    ],
    
    # Audio
    "airpods-pro-2nd-generation": [
        "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800",  # AirPods
        "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800",  # Earbuds
    ],
    "sony-wh-1000xm5": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",  # Headphones
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",  # Headphones
    ],
    "jbl-flip-6": [
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",  # Speaker
        "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=800",  # Speaker
    ],
    
    # Cameras
    "sony-alpha-7-iv": [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",  # Camera
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",  # Camera
    ],
    "dji-mini-4-pro": [
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800",  # Drone
        "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800",  # Drone
    ],
    "gopro-hero-12-black": [
        "https://images.unsplash.com/photo-1526505262320-81542978f63b?w=800",  # GoPro
        "https://images.unsplash.com/photo-1599140780929-5678e93a6a5b?w=800",  # Action Cam
    ],
    
    # Gaming
    "playstation-5-slim": [
        "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800",  # PS5
        "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=800",  # Console
    ],
    "nintendo-switch-oled": [
        "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800",  # Switch
        "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800",  # Gaming
    ],
    
    # Fashion
    "nike-air-max-270-react": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",  # Nike Shoes
        "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800",  # Shoes
    ],
    "levis-501-original-fit-jeans": [
        "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800",  # Jeans
        "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800",  # Jeans
    ],
    "lululemon-align-high-rise-leggings": [
        "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800",  # Leggings
        "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800",  # Activewear
    ],
    
    # Kitchen
    "kitchenaid-artisan-stand-mixer": [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",  # Mixer
        "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800",  # Kitchen
    ],
    "instant-pot-duo-plus-9-in-1": [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",  # Kitchen
        "https://images.unsplash.com/photo-1584990347449-a5d9f800a783?w=800",  # Cooking
    ],
    
    # Fitness
    "fitbit-charge-6": [
        "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800",  # Fitbit
        "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800",  # Watch
    ],
    "bowflex-selecttech-552-dumbbells": [
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800",  # Dumbbells
        "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800",  # Gym
    ],
    
    # Home
    "philips-hue-white-color-starter-kit": [
        "https://images.unsplash.com/photo-1558002038-bb4237b50b11?w=800",  # Smart Lights
        "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800",  # Lights
    ],
    "dyson-v15-detect-cordless-vacuum": [
        "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800",  # Vacuum
        "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800",  # Cleaning
    ],
    
    # Tablets
    "samsung-galaxy-tab-s9": [
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",  # Tablet
        "https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=800",  # Tablet
    ],
    "ipad-air-m2": [
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",  # iPad
        "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800",  # iPad
    ],
    
    # More products - using related images
    "bose-quietcomfort-ultra": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    ],
    "beats-studio-pro": [
        "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",
    ],
    "ray-ban-aviator": [
        "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800",  # Sunglasses
    ],
    "oakley-holbrook": [
        "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800",  # Sunglasses
    ],
    "north-face-jacket": [
        "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",  # Jacket
    ],
    "columbia-fleece": [
        "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",  # Fleece
    ],
    "canon-pixma-printer": [
        "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800",  # Printer
    ],
    "hp-officejet-pro": [
        "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800",
    ],
    "tp-link-wifi-6-router": [
        "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",  # Router
    ],
    "netgear-nighthawk": [
        "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800",
    ],
    "organic-green-tea": [
        "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800",  # Tea
    ],
    "gourmet-coffee-beans": [
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800",  # Coffee
    ],
    "vitamin-c-1000mg": [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",  # Vitamins
    ],
    "first-aid-kit": [
        "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800",  # First Aid
    ],
    "garden-tool-set": [
        "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",  # Garden Tools
    ],
    "plant-pots-set": [
        "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800",  # Plant Pots
    ],
    "acrylic-paint-set": [
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",  # Paint
    ],
    "knitting-kit": [
        "https://images.unsplash.com/photo-1605289982774-9a6fef564df8?w=800",  # Knitting
    ],
    "party-balloons-100pcs": [
        "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",  # Balloons
    ],
    "party-plates-set": [
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",  # Party
    ],
    "travel-backpack-40l": [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",  # Backpack
    ],
    "packing-cubes-set": [
        "https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=800",  # Luggage
    ],
}

# Category images
CATEGORY_IMAGES = {
    "electronics": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800",
    "fashion": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800",
    "home-garden": "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    "sports-outdoors": "https://images.unsplash.com/photo-1461896836934-bd45ba65e5b6?w=800",
    "groceries-food": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "medicine-pharmacy": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    "garden-outdoor": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",
    "crafts-diy": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
    "party-supplies": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
    "travel-luggage": "https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=800",
    "beauty-personal-care": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    "books-stationery": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800",
    "toys-games": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800",
    "automotive": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800",
    "pet-supplies": "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800",
    "baby-products": "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800",
    "health-wellness": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
    "office-supplies": "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800",
    "musical-instruments": "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800",
    "food-beverages": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800",
}

async def download_and_upload(url):
    """Download image from URL and return bytes"""
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        return io.BytesIO(response.content)
    except Exception as e:
        print(f"      ⚠️ Download failed: {e}")
        return None

async def main():
    print("\n" + "="*60)
    print("📸 DOWNLOADING REAL PRODUCT IMAGES")
    print("="*60)
    
    async with async_session() as db:
        
        # ===== UPLOAD CATEGORY IMAGES =====
        print("\n📁 CATEGORIES:\n")
        
        result = await db.execute(select(Category))
        categories = result.scalars().all()
        
        for cat in categories:
            url = CATEGORY_IMAGES.get(cat.slug)
            if not url:
                continue
                
            print(f"  📤 {cat.name}...", end=" ")
            
            img_data = await download_and_upload(url)
            if img_data:
                cloudinary.uploader.upload(
                    img_data,
                    folder="teleshop/categories",
                    public_id=cat.slug,
                    resource_type="image",
                    overwrite=True,
                    format="jpg"
                )
                cat.image_url = f"https://res.cloudinary.com/vck8ep1r/image/upload/v1/teleshop/categories/{cat.slug}"
                print("✅")
            else:
                print("❌")
        
        await db.commit()
        
        # ===== UPLOAD PRODUCT IMAGES =====
        print("\n📦 PRODUCTS:\n")
        
        result = await db.execute(
            select(Product)
            .options(selectinload(Product.images))
            .where(Product.is_active == True)
        )
        products = result.unique().scalars().all()
        
        for product in products:
            urls = PRODUCT_IMAGES.get(product.slug, [])
            if not urls:
                print(f"  ⚠️ {product.name[:40]} - No image URL found")
                continue
            
            print(f"  📦 {product.name[:40]}...", end=" ")
            
            img_data = await download_and_upload(urls[0])
            if not img_data and len(urls) > 1:
                img_data = await download_and_upload(urls[1])
            
            if img_data:
                upload_result = cloudinary.uploader.upload(
                    img_data,
                    folder=f"teleshop/products/{product.id}",
                    public_id=f"{product.slug}_primary",
                    resource_type="image",
                    overwrite=True,
                    format="jpg"
                )
                
                # Update product image
                existing_img = None
                for img in product.images:
                    if img.is_primary:
                        existing_img = img
                        break
                
                if existing_img:
                    existing_img.image_url = upload_result['secure_url']
                    print("✅")
                else:
                    new_img = ProductImage(
                        product_id=product.id,
                        image_url=upload_result['secure_url'],
                        is_primary=True
                    )
                    db.add(new_img)
                    print("✅")
            else:
                print("❌")
        
        await db.commit()
    
    print("\n" + "="*60)
    print("🎉 REAL IMAGES UPLOADED!")
    print("🔄 Refresh browser: http://localhost:5173")
    print("="*60 + "\n")

if __name__ == "__main__":
    # Install requests if needed
    try:
        import requests
    except ImportError:
        import subprocess
        subprocess.run(["pip", "install", "requests"], check=True)
        import requests
    
    asyncio.run(main())