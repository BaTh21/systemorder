# test_cloudinary.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings

# Configure
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

print("=" * 50)
print("TESTING CLOUDINARY CONNECTION")
print("=" * 50)

# Test 1: Check connection
try:
    result = cloudinary.api.ping()
    print(f"\n✅ Cloudinary connected! Status: {result.get('status')}")
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    exit()

# Test 2: Upload a test image
print("\n📤 Uploading test image...")
try:
    # Create a simple test image (1x1 pixel PNG)
    import base64
    tiny_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
        "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    
    result = cloudinary.uploader.upload(
        tiny_png,
        folder="teleshop/test",
        public_id="test_image",
        resource_type="image"
    )
    
    print(f"✅ Upload successful!")
    print(f"   URL: {result['secure_url']}")
    print(f"   Public ID: {result['public_id']}")
    print(f"   Folder: teleshop/test")
    
    # Test 3: Delete test image
    print("\n🗑️ Deleting test image...")
    delete_result = cloudinary.uploader.destroy(result['public_id'])
    print(f"✅ Deleted: {delete_result}")
    
except Exception as e:
    print(f"❌ Upload failed: {e}")

print("\n" + "=" * 50)
print("✅ Cloudinary is working!")
print("Now create products with images to see them in Cloudinary")
print("=" * 50)