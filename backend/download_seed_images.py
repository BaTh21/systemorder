# download_seed_images.py
import os
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import io

# Create upload directories
UPLOAD_DIR = Path("uploads/products")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Working Unsplash image URLs (these are verified working)
PRODUCT_IMAGES = {
    # Smartphones
    "iphone-15-pro-max": [
        "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80",
    ],
    "samsung-galaxy-s24-ultra": [
        "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
    ],
    "google-pixel-8-pro": [
        "https://images.unsplash.com/photo-1598965402089-897ce52e8355?w=800&q=80",
    ],
    
    # Laptops
    "macbook-pro-16-m3-max": [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    ],
    "dell-xps-15": [
        "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
    ],
    "asus-rog-zephyrus-g14": [
        "https://images.unsplash.com/photo-1593642702749-b7d2a1a3be9e?w=800&q=80",
    ],
    
    # Audio
    "airpods-pro-2nd-generation": [
        "https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=800&q=80",
    ],
    "sony-wh-1000xm5": [
        "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80",
    ],
    "jbl-flip-6": [
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
    ],
    
    # Cameras
    "sony-alpha-7-iv": [
        "https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=800&q=80",
    ],
    "dji-mini-4-pro": [
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
    ],
    "gopro-hero-12-black": [
        "https://images.unsplash.com/photo-1506880918293-25b26e50aeb8?w=800&q=80",
    ],
    
    # Gaming
    "playstation-5-slim": [
        "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80",
    ],
    "nintendo-switch-oled": [
        "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800&q=80",
    ],
    
    # Fashion
    "nike-air-max-270-react": [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    ],
    "levis-501-original-fit-jeans": [
        "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800&q=80",
    ],
    "lululemon-align-high-rise-leggings": [
        "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&q=80",
    ],
    
    # Kitchen
    "kitchenaid-artisan-stand-mixer": [
        "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=800&q=80",
    ],
    "instant-pot-duo-plus-9-in-1": [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    ],
    
    # Fitness
    "fitbit-charge-6": [
        "https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=800&q=80",
    ],
    "bowflex-selecttech-552-dumbbells": [
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    ],
    
    # Home
    "philips-hue-white-color-starter-kit": [
        "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80",
    ],
    "dyson-v15-detect-cordless-vacuum": [
        "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=80",
    ],
}


def create_placeholder_image(slug, product_name, size=(800, 800)):
    """Create a placeholder image with product name"""
    # Create directory
    product_dir = UPLOAD_DIR / slug
    product_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate color based on slug
    import hashlib
    hash_val = int(hashlib.md5(slug.encode()).hexdigest()[:6], 16)
    r = (hash_val >> 16) & 0xFF
    g = (hash_val >> 8) & 0xFF
    b = hash_val & 0xFF
    
    # Create image
    img = Image.new('RGB', size, (r, g, b))
    draw = ImageDraw.Draw(img)
    
    # Add border
    draw.rectangle([0, 0, size[0]-1, size[1]-1], outline='#FFFFFF', width=4)
    
    # Add text
    try:
        # Try to use a larger font
        font_size = 40
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Word wrap the product name
        words = product_name.split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            line_text = ' '.join(current_line)
            bbox = draw.textbbox((0, 0), line_text, font=font)
            if bbox[2] - bbox[0] > size[0] - 40:
                if len(current_line) > 1:
                    current_line.pop()
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
                    current_line = []
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw text
        y_offset = size[1] // 3
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (size[0] - text_width) // 2
            draw.text((x, y_offset), line, fill='#FFFFFF', font=font)
            y_offset += font_size + 10
        
        # Add price tag area
        draw.text((size[0]//2 - 50, size[1] - 80), "📦 Product Image", fill='#FFFFFF', font=font)
        
    except Exception as e:
        print(f"  ⚠️  Could not add text: {e}")
    
    # Save image
    file_path = product_dir / f"{slug}_0.jpg"
    img.save(file_path, 'JPEG', quality=85)
    return file_path


def download_images():
    """Download product images or create placeholders"""
    total = len(PRODUCT_IMAGES)
    downloaded = 0
    created = 0
    
    print(f"\n🖼️  Processing {total} product images...")
    print("="*60)
    
    for slug, urls in PRODUCT_IMAGES.items():
        product_dir = UPLOAD_DIR / slug
        product_dir.mkdir(parents=True, exist_ok=True)
        
        success = False
        for i, url in enumerate(urls):
            file_name = f"{slug}_{i}.jpg"
            file_path = product_dir / file_name
            
            if file_path.exists():
                print(f"  ✅ Already exists: {slug}")
                success = True
                downloaded += 1
                break
            
            try:
                print(f"  📥 Downloading: {slug}...")
                response = requests.get(url, timeout=30, 
                    headers={'User-Agent': 'Mozilla/5.0'})
                
                if response.status_code == 200:
                    with open(file_path, 'wb') as f:
                        f.write(response.content)
                    downloaded += 1
                    success = True
                    print(f"    ✅ Downloaded: {file_name}")
                    break
                else:
                    print(f"    ⚠️  HTTP {response.status_code} for URL {i+1}")
                    
            except Exception as e:
                print(f"    ⚠️  Error: {str(e)[:50]}")
        
        # If download failed, create placeholder
        if not success:
            print(f"  🎨 Creating placeholder for: {slug}")
            # Convert slug to readable name
            product_name = slug.replace('-', ' ').title()
            create_placeholder_image(slug, product_name)
            created += 1
    
    print("\n" + "="*60)
    print(f"✅ RESULTS:")
    print(f"   📥 Downloaded: {downloaded} images")
    print(f"   🎨 Created placeholders: {created}")
    print(f"   📁 Total products: {total}")
    print(f"   📂 Images saved to: {UPLOAD_DIR.absolute()}")
    print("="*60 + "\n")


def create_category_placeholders():
    """Create placeholder images for categories"""
    print("\n📁 Creating category images...")
    cat_dir = Path("uploads/categories")
    cat_dir.mkdir(parents=True, exist_ok=True)
    
    categories = {
        "electronics": "#007AFF",
        "smartphones-tablets": "#5856D6",
        "laptops-computers": "#AF52DE",
        "audio-headphones": "#FF2D55",
        "cameras-photography": "#FF9500",
        "gaming-entertainment": "#32ADE6",
        "fashion": "#FF3B30",
        "mens-clothing": "#34C759",
        "womens-clothing": "#FF6B35",
        "home-garden": "#007AFF",
        "kitchen-dining": "#FF9500",
        "home-decor": "#AF52DE",
        "sports-outdoors": "#34C759",
        "fitness-equipment": "#007AFF",
    }
    
    for slug, color in categories.items():
        file_path = cat_dir / f"{slug}.jpg"
        if not file_path.exists():
            # Create simple colored image
            img = Image.new('RGB', (400, 300), color)
            draw = ImageDraw.Draw(img)
            draw.rectangle([0, 0, 399, 299], outline='#FFFFFF', width=3)
            
            # Add category name
            try:
                font = ImageFont.truetype("arial.ttf", 30)
            except:
                font = ImageFont.load_default()
            
            name = slug.replace('-', ' ').title()
            bbox = draw.textbbox((0, 0), name, font=font)
            text_width = bbox[2] - bbox[0]
            x = (400 - text_width) // 2
            y = 130
            draw.text((x, y), name, fill='#FFFFFF', font=font)
            
            img.save(file_path, 'JPEG', quality=85)
            print(f"  ✅ Created: {slug}.jpg")
    
    print("  ✅ Category images created!")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🖼️  TELESHOP IMAGE DOWNLOADER")
    print("="*60)
    
    # Create category placeholders
    create_category_placeholders()
    
    # Download product images
    download_images()
    
    print("🎉 All done! Now run: python seed_all_data.py")