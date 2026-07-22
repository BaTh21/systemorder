# upload_qr_to_cloudinary.py
import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

# Upload QR code image
result = cloudinary.uploader.upload(
    "uploads/payments/qr-code.jpg",  # Path to your QR image
    folder="teleshop/payments",
    public_id="qr-code",
    resource_type="image",
    overwrite=True,
    format="jpg"
)

print(f"✅ QR Code uploaded!")
print(f"URL: {result['secure_url']}")