# diagnose_images.py
import asyncio
import requests
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.core.config import settings
from app.models.product import Product, ProductImage
from app.models.category import Category

BASE_URL = "http://localhost:8000"

print("=" * 70)
print("🔍 COMPLETE IMAGE DIAGNOSTIC")
print("=" * 70)

# 1. CHECK SERVER IS RUNNING
print("\n📡 1. CHECKING SERVER...")
try:
    response = requests.get(f"{BASE_URL}/", timeout=5)
    print(f"   ✅ Server is running (Status: {response.status_code})")
except Exception as e:
    print(f"   ❌ Server is NOT running! Start with: uvicorn app.main:app --reload")
    print(f"   Error: {e}")
    exit()

# 2. CHECK STATIC FILES MOUNTED
print("\n📁 2. CHECKING STATIC FILES...")
test_urls = [
    f"{BASE_URL}/uploads/",
    f"{BASE_URL}/uploads/products/",
]

for url in test_urls:
    try:
        r = requests.get(url)
        if r.status_code in [200, 404, 403]:
            print(f"   ✅ Static mount working: {url} (Status: {r.status_code})")
        else:
            print(f"   ⚠️  Unusual response: {url} (Status: {r.status_code})")
    except Exception as e:
        print(f"   ❌ Cannot access: {url} - {e}")

# 3. CHECK FILE SYSTEM
print("\n💾 3. CHECKING FILE SYSTEM...")
paths_to_check = [
    "uploads",
    "uploads/products",
    "uploads/categories",
    "uploads/payments",
]

for p in paths_to_check:
    path = Path(p)
    if path.exists():
        print(f"   ✅ {p}/ exists")
        # Count files
        files = list(path.glob("*"))
        print(f"      Contains: {len(files)} items")
    else:
        print(f"   ❌ {p}/ does NOT exist!")

# 4. CHECK DATABASE IMAGE URLs
print("\n🗄️  4. CHECKING DATABASE IMAGE URLs...")

async def check_db():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Count products
        total = await db.execute(select(text("COUNT(*) FROM products")))
        total_products = total.scalar()
        print(f"   Total products: {total_products}")
        
        # Count images
        total = await db.execute(select(text("COUNT(*) FROM product_images")))
        total_images = total.scalar()
        print(f"   Total images: {total_images}")
        
        # Get sample products with images
        result = await db.execute(
            select(Product)
            .limit(5)
        )
        products = result.scalars().all()
        
        for product in products:
            print(f"\n   📦 Product: {product.name} (ID: {product.id})")
            
            # Get images for this product
            img_result = await db.execute(
                select(ProductImage).where(ProductImage.product_id == product.id)
            )
            images = img_result.scalars().all()
            
            print(f"      Images in DB: {len(images)}")
            
            for img in images:
                url = img.image_url
                print(f"      URL: {url}")
                print(f"      Is Primary: {img.is_primary}")
                
                # Check if URL format is correct
                if url.startswith('D:') or url.startswith('C:'):
                    print(f"      ❌ Windows absolute path - NEEDS FIX!")
                elif url.startswith('http'):
                    print(f"      ℹ️  External URL")
                elif url.startswith('/uploads'):
                    print(f"      ✅ Correct relative path")
                elif url.startswith('uploads/'):
                    print(f"      ⚠️  Missing leading slash")
                else:
                    print(f"      ❌ Unknown format!")
                
                # Try to access the image
                if url.startswith('/uploads'):
                    test_url = f"http://localhost:8000{url}"
                elif url.startswith('uploads/'):
                    test_url = f"http://localhost:8000/{url}"
                elif url.startswith('http'):
                    test_url = url
                else:
                    test_url = None
                
                if test_url:
                    try:
                        r = requests.head(test_url, timeout=5)
                        if r.status_code == 200:
                            print(f"      ✅ Accessible: {r.status_code} ({r.headers.get('content-type', 'N/A')})")
                        else:
                            print(f"      ❌ Not accessible: {r.status_code}")
                    except Exception as e:
                        print(f"      ❌ Error: {str(e)[:50]}")

asyncio.run(check_db())

# 5. CHECK SAMPLE PRODUCT FOLDER
print("\n📂 5. CHECKING SAMPLE PRODUCT FOLDERS...")
products_dir = Path("uploads/products")
if products_dir.exists():
    folders = [f for f in products_dir.iterdir() if f.is_dir()]
    print(f"   Found {len(folders)} product folders")
    
    for folder in folders[:3]:  # Check first 3
        files = list(folder.glob("*"))
        print(f"\n   📁 {folder.name}/")
        print(f"      Files: {len(files)}")
        for f in files[:2]:
            print(f"      - {f.name} ({f.stat().st_size} bytes)")

# 6. TEST DIRECT IMAGE ACCESS
print("\n🖼️  6. TESTING DIRECT IMAGE ACCESS...")
sample_image = None
if products_dir.exists():
    for folder in products_dir.iterdir():
        if folder.is_dir():
            jpgs = list(folder.glob("*.jpg"))
            if jpgs:
                sample_image = jpgs[0]
                break

if sample_image:
    relative_path = f"/uploads/products/{sample_image.parent.name}/{sample_image.name}"
    test_url = f"http://localhost:8000{relative_path}"
    print(f"   Testing: {test_url}")
    try:
        r = requests.get(test_url, timeout=5)
        if r.status_code == 200:
            content_type = r.headers.get('content-type', 'unknown')
            print(f"   ✅ Image accessible!")
            print(f"      Status: {r.status_code}")
            print(f"      Content-Type: {content_type}")
            print(f"      Size: {len(r.content)} bytes")
        else:
            print(f"   ❌ Status: {r.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
else:
    print("   ❌ No sample images found!")

# 7. SUMMARY & FIXES
print("\n" + "=" * 70)
print("📋 SUMMARY & REQUIRED FIXES")
print("=" * 70)
print("""
1. Make sure app/main.py has:
   app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

2. Image URLs in database should be:
   /uploads/products/folder-name/image.jpg
   NOT: D:\\systemorder-git\\...\\uploads\\...

3. If images show Windows paths, run:
   python fix_image_urls.py

4. Restart server after changes:
   uvicorn app.main:app --reload

5. Frontend should prepend http://localhost:8000 to image URLs
""")