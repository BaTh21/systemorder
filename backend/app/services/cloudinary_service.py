# app/services/cloudinary_service.py
import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings
from typing import Optional

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
        
        # Upload options
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "image",
            "quality": "auto",
            "fetch_format": "auto",
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            contents,
            **upload_options
        )
        
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
        }
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        raise


async def delete_image(public_id: str):
    """
    Delete image from Cloudinary
    
    Args:
        public_id: The public ID of the image to delete
    
    Returns:
        dict: Delete result
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        raise


def get_image_url(public_id: str, transformations: Optional[str] = None):
    """
    Get image URL with optional transformations
    
    Args:
        public_id: The public ID of the image
        transformations: Optional transformation string (e.g., "w_300,h_300,c_fill")
    
    Returns:
        str: Image URL
    """
    if transformations:
        return cloudinary.CloudinaryImage(public_id).build_url(
            transformation=transformations,
            secure=True
        )
    return cloudinary.CloudinaryImage(public_id).build_url(secure=True)


def get_thumbnail_url(public_id: str, width: int = 300, height: int = 300):
    """Get thumbnail URL"""
    return get_image_url(public_id, f"w_{width},h_{height},c_fill,q_auto")