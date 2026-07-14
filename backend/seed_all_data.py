# seed_all_data.py - Updated version with local images
import asyncio
import sys
import os
from pathlib import Path
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, text
from app.core.config import settings
from app.models.category import Category
from app.models.product import Product, ProductImage, ProductVariant
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.utils import slugify

# ============================================
# PRODUCT DATA - Using local image paths
# ============================================
PRODUCT_DATA = {
    "Smartphones & Tablets": {
        "products": [
            {
                "name": "iPhone 15 Pro Max",
                "description": "Apple iPhone 15 Pro Max with A17 Pro chip, 48MP camera system, titanium design, and USB-C connector.",
                "base_price": 1199.99,
                "stock": 50,
                "supplier": "Apple Inc.",
                "supplier_url": "https://apple.com/iphone",
                "discount_percent": 5,
                "image_slug": "iphone-15-pro-max",
                "variants": [
                    {"name": "256GB - Natural Titanium", "price_modifier": 0, "stock": 15},
                    {"name": "256GB - Blue Titanium", "price_modifier": 0, "stock": 15},
                    {"name": "512GB - Natural Titanium", "price_modifier": 200, "stock": 10},
                    {"name": "1TB - Black Titanium", "price_modifier": 400, "stock": 10}
                ]
            },
            {
                "name": "Samsung Galaxy S24 Ultra",
                "description": "Samsung Galaxy S24 Ultra with Galaxy AI, 200MP camera, built-in S Pen, and titanium frame.",
                "base_price": 1299.99,
                "stock": 40,
                "supplier": "Samsung Electronics",
                "supplier_url": "https://samsung.com",
                "discount_percent": 8,
                "image_slug": "samsung-galaxy-s24-ultra",
                "variants": [
                    {"name": "256GB - Titanium Gray", "price_modifier": 0, "stock": 20},
                    {"name": "512GB - Titanium Black", "price_modifier": 120, "stock": 20}
                ]
            },
            {
                "name": "Google Pixel 8 Pro",
                "description": "Google Pixel 8 Pro with Tensor G3, advanced AI features, 50MP camera, and 7 years of updates.",
                "base_price": 999.99,
                "stock": 35,
                "supplier": "Google LLC",
                "supplier_url": "https://store.google.com",
                "discount_percent": 10,
                "image_slug": "google-pixel-8-pro",
                "variants": [
                    {"name": "128GB - Obsidian", "price_modifier": 0, "stock": 20},
                    {"name": "256GB - Bay Blue", "price_modifier": 60, "stock": 15}
                ]
            }
        ]
    },
    "Laptops & Computers": {
        "products": [
            {
                "name": "MacBook Pro 16 M3 Max",
                "description": "Apple MacBook Pro with M3 Max chip, 16-inch Liquid Retina XDR display, 36GB RAM, 1TB SSD.",
                "base_price": 3499.99,
                "stock": 25,
                "supplier": "Apple Inc.",
                "supplier_url": "https://apple.com/macbook-pro",
                "discount_percent": 3,
                "image_slug": "macbook-pro-16-m3-max",
                "variants": [
                    {"name": "M3 Max 36GB/1TB - Space Black", "price_modifier": 0, "stock": 15},
                    {"name": "M3 Max 48GB/1TB - Silver", "price_modifier": 400, "stock": 10}
                ]
            },
            {
                "name": "Dell XPS 15",
                "description": "Dell XPS 15 with Intel Core i7, 16GB RAM, 512GB SSD, 15.6-inch OLED display.",
                "base_price": 1499.99,
                "stock": 20,
                "supplier": "Dell Technologies",
                "supplier_url": "https://dell.com",
                "discount_percent": 12,
                "image_slug": "dell-xps-15",
                "variants": [
                    {"name": "i7/16GB/512GB - Platinum", "price_modifier": 0, "stock": 10},
                    {"name": "i9/32GB/1TB - Graphite", "price_modifier": 500, "stock": 10}
                ]
            },
            {
                "name": "ASUS ROG Zephyrus G14",
                "description": "ASUS ROG gaming laptop with AMD Ryzen 9, RTX 4070, 14-inch QHD 165Hz display.",
                "base_price": 1799.99,
                "stock": 20,
                "supplier": "ASUS Computer",
                "supplier_url": "https://asus.com",
                "discount_percent": 8,
                "image_slug": "asus-rog-zephyrus-g14",
                "variants": [
                    {"name": "RTX 4060 - Moonlight White", "price_modifier": 0, "stock": 10},
                    {"name": "RTX 4070 - Eclipse Gray", "price_modifier": 200, "stock": 10}
                ]
            }
        ]
    },
    "Audio & Headphones": {
        "products": [
            {
                "name": "AirPods Pro 2nd Generation",
                "description": "Apple AirPods Pro with USB-C, Active Noise Cancellation, Adaptive Audio, and Spatial Audio.",
                "base_price": 249.99,
                "stock": 100,
                "supplier": "Apple Inc.",
                "supplier_url": "https://apple.com/airpods",
                "discount_percent": 0,
                "image_slug": "airpods-pro-2nd-generation",
                "variants": []
            },
            {
                "name": "Sony WH-1000XM5",
                "description": "Sony WH-1000XM5 wireless noise-canceling headphones with 30-hour battery.",
                "base_price": 349.99,
                "stock": 60,
                "supplier": "Sony Corporation",
                "supplier_url": "https://sony.com",
                "discount_percent": 15,
                "image_slug": "sony-wh-1000xm5",
                "variants": [
                    {"name": "Black", "price_modifier": 0, "stock": 30},
                    {"name": "Silver", "price_modifier": 0, "stock": 30}
                ]
            },
            {
                "name": "JBL Flip 6",
                "description": "JBL Flip 6 portable waterproof Bluetooth speaker with 12-hour battery.",
                "base_price": 129.99,
                "stock": 80,
                "supplier": "JBL (Harman)",
                "supplier_url": "https://jbl.com",
                "discount_percent": 20,
                "image_slug": "jbl-flip-6",
                "variants": [
                    {"name": "Black", "price_modifier": 0, "stock": 30},
                    {"name": "Blue", "price_modifier": 0, "stock": 25},
                    {"name": "Red", "price_modifier": 0, "stock": 25}
                ]
            }
        ]
    },
    "Cameras & Photography": {
        "products": [
            {
                "name": "Sony Alpha 7 IV",
                "description": "Sony A7 IV full-frame mirrorless camera with 33MP sensor and 4K 60fps video.",
                "base_price": 2499.99,
                "stock": 15,
                "supplier": "Sony Corporation",
                "supplier_url": "https://sony.com",
                "discount_percent": 0,
                "image_slug": "sony-alpha-7-iv",
                "variants": [
                    {"name": "Body Only", "price_modifier": 0, "stock": 8},
                    {"name": "With 28-70mm Kit", "price_modifier": 300, "stock": 7}
                ]
            },
            {
                "name": "DJI Mini 4 Pro",
                "description": "DJI Mini 4 Pro drone with 4K HDR video, omnidirectional obstacle sensing, under 249g.",
                "base_price": 759.99,
                "stock": 20,
                "supplier": "DJI Technology",
                "supplier_url": "https://dji.com",
                "discount_percent": 8,
                "image_slug": "dji-mini-4-pro",
                "variants": [
                    {"name": "Standard", "price_modifier": 0, "stock": 10},
                    {"name": "Fly More Combo", "price_modifier": 200, "stock": 10}
                ]
            },
            {
                "name": "GoPro Hero 12 Black",
                "description": "GoPro HERO12 Black with 5.3K video, HyperSmooth 6.0, waterproof to 33ft.",
                "base_price": 399.99,
                "stock": 35,
                "supplier": "GoPro Inc.",
                "supplier_url": "https://gopro.com",
                "discount_percent": 10,
                "image_slug": "gopro-hero-12-black",
                "variants": []
            }
        ]
    },
    "Gaming & Entertainment": {
        "products": [
            {
                "name": "PlayStation 5 Slim",
                "description": "Sony PlayStation 5 Slim with 1TB SSD, DualSense controller, and 4K gaming.",
                "base_price": 499.99,
                "stock": 30,
                "supplier": "Sony Interactive",
                "supplier_url": "https://playstation.com",
                "discount_percent": 0,
                "image_slug": "playstation-5-slim",
                "variants": [
                    {"name": "Disc Edition", "price_modifier": 0, "stock": 20},
                    {"name": "Digital Edition", "price_modifier": -50, "stock": 10}
                ]
            },
            {
                "name": "Nintendo Switch OLED",
                "description": "Nintendo Switch OLED with 7-inch OLED screen and 64GB storage.",
                "base_price": 349.99,
                "stock": 40,
                "supplier": "Nintendo Co.",
                "supplier_url": "https://nintendo.com",
                "discount_percent": 0,
                "image_slug": "nintendo-switch-oled",
                "variants": [
                    {"name": "White Joy-Con", "price_modifier": 0, "stock": 20},
                    {"name": "Neon Red/Blue Joy-Con", "price_modifier": 0, "stock": 20}
                ]
            }
        ]
    },
    "Men's Clothing": {
        "products": [
            {
                "name": "Nike Air Max 270 React",
                "description": "Nike Air Max 270 React men's shoes with Max Air unit and breathable mesh upper.",
                "base_price": 150.00,
                "stock": 80,
                "supplier": "Nike Inc.",
                "supplier_url": "https://nike.com",
                "discount_percent": 20,
                "image_slug": "nike-air-max-270-react",
                "variants": [
                    {"name": "US 8 - Black/White", "price_modifier": 0, "stock": 20},
                    {"name": "US 9 - Black/White", "price_modifier": 0, "stock": 20},
                    {"name": "US 10 - White/Red", "price_modifier": 0, "stock": 20},
                    {"name": "US 11 - Navy/White", "price_modifier": 0, "stock": 20}
                ]
            },
            {
                "name": "Levi's 501 Original Fit Jeans",
                "description": "Levi's 501 Original Fit men's jeans, iconic straight leg with button fly.",
                "base_price": 69.99,
                "stock": 120,
                "supplier": "Levi Strauss & Co.",
                "supplier_url": "https://levi.com",
                "discount_percent": 0,
                "image_slug": "levis-501-original-fit-jeans",
                "variants": [
                    {"name": "30x32 - Dark Wash", "price_modifier": 0, "stock": 30},
                    {"name": "32x32 - Medium Wash", "price_modifier": 0, "stock": 30},
                    {"name": "34x32 - Light Wash", "price_modifier": 0, "stock": 30},
                    {"name": "36x34 - Black", "price_modifier": 0, "stock": 30}
                ]
            }
        ]
    },
    "Women's Clothing": {
        "products": [
            {
                "name": "Lululemon Align High-Rise Leggings",
                "description": "Lululemon Align leggings with Nulu fabric, buttery-soft feel, 28-inch inseam.",
                "base_price": 98.00,
                "stock": 100,
                "supplier": "Lululemon Athletica",
                "supplier_url": "https://lululemon.com",
                "discount_percent": 0,
                "image_slug": "lululemon-align-high-rise-leggings",
                "variants": [
                    {"name": "S - Black", "price_modifier": 0, "stock": 30},
                    {"name": "M - True Navy", "price_modifier": 0, "stock": 25},
                    {"name": "L - Dark Olive", "price_modifier": 0, "stock": 25},
                    {"name": "XL - Black", "price_modifier": 0, "stock": 20}
                ]
            }
        ]
    },
    "Kitchen & Dining": {
        "products": [
            {
                "name": "KitchenAid Artisan Stand Mixer",
                "description": "KitchenAid Artisan Series 5-Quart Tilt-Head Stand Mixer with 10 speeds.",
                "base_price": 449.99,
                "stock": 30,
                "supplier": "KitchenAid (Whirlpool)",
                "supplier_url": "https://kitchenaid.com",
                "discount_percent": 10,
                "image_slug": "kitchenaid-artisan-stand-mixer",
                "variants": [
                    {"name": "Empire Red", "price_modifier": 0, "stock": 10},
                    {"name": "Matte Black", "price_modifier": 0, "stock": 10},
                    {"name": "Silver", "price_modifier": 0, "stock": 10}
                ]
            },
            {
                "name": "Instant Pot Duo Plus 9-in-1",
                "description": "Instant Pot Duo Plus 6-Quart 9-in-1 electric pressure cooker and slow cooker.",
                "base_price": 89.99,
                "stock": 70,
                "supplier": "Instant Brands",
                "supplier_url": "https://instantpot.com",
                "discount_percent": 20,
                "image_slug": "instant-pot-duo-plus-9-in-1",
                "variants": [
                    {"name": "6 Quart", "price_modifier": 0, "stock": 40},
                    {"name": "8 Quart", "price_modifier": 30, "stock": 30}
                ]
            }
        ]
    },
    "Fitness Equipment": {
        "products": [
            {
                "name": "Fitbit Charge 6",
                "description": "Fitbit Charge 6 fitness tracker with Google integration, GPS, and 7-day battery.",
                "base_price": 159.99,
                "stock": 60,
                "supplier": "Fitbit (Google)",
                "supplier_url": "https://fitbit.com",
                "discount_percent": 0,
                "image_slug": "fitbit-charge-6",
                "variants": [
                    {"name": "Obsidian Black", "price_modifier": 0, "stock": 30},
                    {"name": "Porcelain White", "price_modifier": 0, "stock": 30}
                ]
            },
            {
                "name": "Bowflex SelectTech 552 Dumbbells",
                "description": "Bowflex adjustable dumbbells from 5 to 52.5 lbs each, replaces 15 sets of weights.",
                "base_price": 429.99,
                "stock": 20,
                "supplier": "Bowflex Inc.",
                "supplier_url": "https://bowflex.com",
                "discount_percent": 10,
                "image_slug": "bowflex-selecttech-552-dumbbells",
                "variants": []
            }
        ]
    },
    "Home Decor": {
        "products": [
            {
                "name": "Philips Hue White & Color Starter Kit",
                "description": "Philips Hue Smart Bulb Starter Kit with Bridge, 3 bulbs, 16 million colors.",
                "base_price": 179.99,
                "stock": 45,
                "supplier": "Signify (Philips)",
                "supplier_url": "https://philips-hue.com",
                "discount_percent": 10,
                "image_slug": "philips-hue-white-color-starter-kit",
                "variants": []
            },
            {
                "name": "Dyson V15 Detect Cordless Vacuum",
                "description": "Dyson V15 Detect with laser dust detection, piezo sensor, and 60-min runtime.",
                "base_price": 749.99,
                "stock": 25,
                "supplier": "Dyson Ltd.",
                "supplier_url": "https://dyson.com",
                "discount_percent": 12,
                "image_slug": "dyson-v15-detect-cordless-vacuum",
                "variants": []
            }
        ]
    }
}

PARENT_CATEGORIES = {
    "Electronics": ["Smartphones & Tablets", "Laptops & Computers", "Audio & Headphones", "Cameras & Photography", "Gaming & Entertainment"],
    "Fashion": ["Men's Clothing", "Women's Clothing"],
    "Home & Garden": ["Kitchen & Dining", "Home Decor"],
    "Sports & Outdoors": ["Fitness Equipment"]
}


def get_image_url(image_slug, index=0):
    """Get local image URL or fallback to placeholder"""
    local_path = Path(f"uploads/products/{image_slug}/{image_slug}_{index}.jpg")
    
    if local_path.exists():
        # Return relative URL that FastAPI can serve
        return f"/uploads/products/{image_slug}/{image_slug}_{index}.jpg"
    else:
        # Fallback to placeholder
        return f"https://via.placeholder.com/600x400/EEE/999?text={image_slug.replace('-', ' ').title()}"


async def seed_all_data():
    """Main function to seed all product data"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("\n" + "="*60)
        print("🚀 TELESHOP DATA SEEDING")
        print("="*60)
        
        # Check existing data
        result = await db.execute(select(func.count(Product.id)))
        product_count = result.scalar()
        
        if product_count > 0:
            print(f"\n⚠️  Database already has {product_count} products.")
            response = input("Clear and re-seed? (yes/no): ").strip().lower()
            if response != 'yes':
                print("❌ Seeding cancelled.")
                return
            
            print("\n🗑️  Clearing existing data...")
            await db.execute(text("DELETE FROM product_images"))
            await db.execute(text("DELETE FROM product_variants"))
            await db.execute(text("DELETE FROM cart_items"))
            await db.execute(text("DELETE FROM order_items"))
            await db.execute(text("DELETE FROM orders"))
            await db.execute(text("DELETE FROM products"))
            await db.execute(text("DELETE FROM categories"))
            await db.commit()
            print("   ✅ Data cleared!")
        
        # Create parent categories
        print("\n📁 Creating parent categories...")
        parent_cats = {}
        for parent_name in PARENT_CATEGORIES.keys():
            slug = slugify(parent_name)
            category = Category(
                name=parent_name,
                slug=slug,
                image_url=None,
                parent_id=None
            )
            db.add(category)
            await db.flush()
            parent_cats[parent_name] = category
            print(f"   ✅ {parent_name} (ID: {category.id})")
        
        # Create subcategories
        print("\n📁 Creating subcategories...")
        all_categories = {}
        for parent_name, children in PARENT_CATEGORIES.items():
            parent = parent_cats[parent_name]
            for child_name in children:
                if child_name in PRODUCT_DATA:
                    slug = slugify(child_name)
                    category = Category(
                        name=child_name,
                        slug=slug,
                        image_url=None,
                        parent_id=parent.id
                    )
                    db.add(category)
                    await db.flush()
                    all_categories[child_name] = category
                    print(f"   ✅ {child_name} (Parent: {parent_name})")
        
        await db.commit()
        
        # Create products
        print("\n🛍️  Creating products with images...")
        total_products = 0
        total_variants = 0
        total_images = 0
        
        for cat_name, cat_data in PRODUCT_DATA.items():
            if cat_name not in all_categories:
                continue
            
            category = all_categories[cat_name]
            print(f"\n   📂 {cat_name}:")
            
            for prod_data in cat_data["products"]:
                base_slug = slugify(prod_data["name"])
                slug = base_slug
                counter = 1
                while True:
                    existing = await db.execute(
                        select(Product).where(Product.slug == slug)
                    )
                    if not existing.scalars().first():
                        break
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                
                product = Product(
                    name=prod_data["name"],
                    slug=slug,
                    description=prod_data.get("description", ""),
                    base_price=Decimal(str(prod_data["base_price"])),
                    stock=prod_data.get("stock", 0),
                    category_id=category.id,
                    supplier=prod_data.get("supplier", "Unknown"),
                    supplier_url=prod_data.get("supplier_url"),
                    discount_percent=float(prod_data.get("discount_percent", 0)),
                    is_active=True
                )
                db.add(product)
                await db.flush()
                
                # Add images
                image_slug = prod_data.get("image_slug", slug)
                
                # Primary image
                primary_url = get_image_url(image_slug, 0)
                product_image = ProductImage(
                    product_id=product.id,
                    image_url=primary_url,
                    is_primary=True
                )
                db.add(product_image)
                total_images += 1
                
                # Secondary image (if exists)
                secondary_url = get_image_url(image_slug, 1)
                # Check if secondary image is not a placeholder
                if f"{image_slug}_1.jpg" in str(Path(f"uploads/products/{image_slug}").glob("*.jpg")):
                    second_image = ProductImage(
                        product_id=product.id,
                        image_url=secondary_url,
                        is_primary=False
                    )
                    db.add(second_image)
                    total_images += 1
                
                # Create variants
                for variant_data in prod_data.get("variants", []):
                    variant = ProductVariant(
                        product_id=product.id,
                        name=variant_data["name"],
                        price_modifier=Decimal(str(variant_data.get("price_modifier", 0))),
                        stock=variant_data.get("stock", 0)
                    )
                    db.add(variant)
                    total_variants += 1
                
                total_products += 1
                discount = f" (-{prod_data['discount_percent']}%)" if prod_data.get('discount_percent', 0) > 0 else ""
                print(f"      ✅ {prod_data['name']} - ${prod_data['base_price']}{discount}")
        
        await db.commit()
        
        # Create test customer
        print("\n👤 Setting up test customer...")
        result = await db.execute(
            select(User).where(User.email == "customer@test.com")
        )
        if not result.scalars().first():
            customer = User(
                email="customer@test.com",
                hashed_password=get_password_hash("customer123"),
                full_name="Test Customer",
                phone="+1234567890",
                role=UserRole.customer,
                is_active=True
            )
            db.add(customer)
            await db.commit()
            print("   ✅ Test customer created")
        else:
            print("   ℹ️  Test customer already exists")
        
        print("\n" + "="*60)
        print("✅ DATABASE SEEDING COMPLETE!")
        print("="*60)
        print(f"📁 Parent Categories: {len(parent_cats)}")
        print(f"📁 Subcategories: {len(all_categories)}")
        print(f"🛍️  Total Products: {total_products}")
        print(f"🖼️  Total Images: {total_images}")
        print(f"📦 Total Variants: {total_variants}")
        print(f"\n👤 Admin Login:")
        print(f"   Email: admin@gmail.com")
        print(f"   Password: admin123")
        print(f"\n👤 Customer Login:")
        print(f"   Email: customer@test.com")
        print(f"   Password: customer123")
        print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(seed_all_data())