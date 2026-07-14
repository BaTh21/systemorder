# app/services/cloudinary_service.py
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings
from typing import Optional
import os

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_image(file, folder: str = "products", public_id: Optional[str] = None):
    """
    Upload image to Cloudinary
    
    Args:
        file: UploadFile from FastAPI
        folder: Folder name in Cloudinary (products, categories, payments)
        public_id: Optional custom public ID
    
    Returns:
        dict: Upload result with url and public_id
    """
    try:
        # Read file content
        contents = await file.read()
        
        # Get file extension
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        
        # Upload options
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "image",
            "quality": "auto",
            "fetch_format": "auto",
            "format": file_extension.replace('.', ''),  # Preserve original format
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            contents,
            **upload_options
        )
        
        # Return secure URL with explicit format
        secure_url = cloudinary.CloudinaryImage(result['public_id']).build_url(
            format=result.get('format', 'jpg'),
            secure=True
        )
        
        return {
            "url": secure_url,
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
        }
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        raise