import cloudinary
import cloudinary.uploader
import cloudinary.api
from app.core.config import settings
from typing import Optional
import os
import time

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True
)

async def upload_image(file, folder: str = "products", public_id: Optional[str] = None):
    """Upload image to Cloudinary"""
    try:
        contents = await file.read()
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "image",
            "quality": "auto",
            "fetch_format": "auto",
            "type": "upload",
            "access_mode": "public",
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        result = cloudinary.uploader.upload(contents, **upload_options)
        
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


async def upload_voice(file, folder: str = "chat/voice", public_id: Optional[str] = None):
    """
    Upload voice/audio file to Cloudinary - forces MP3 format
    """
    try:
        contents = await file.read()
        
        filename = f"voice_{int(time.time())}"
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "video",
            "format": "mp3",              
            "audio_codec": "mp3",         
            "type": "upload",
            "access_mode": "public",
            "public_id": public_id or filename,
            "overwrite": True,
        }
        
        result = cloudinary.uploader.upload(contents, **upload_options)
        
        # Build URL with .mp3 extension
        secure_url = result["secure_url"]
        # Replace any extension with .mp3
        if '.' in secure_url.split('/')[-1]:
            secure_url = secure_url.rsplit('.', 1)[0] + '.mp3'
        
        return {
            "url": secure_url,
            "public_id": result["public_id"],
            "format": "mp3",
        }
    except Exception as e:
        print(f"Cloudinary voice upload error: {e}")
        raise


async def upload_file_attachment(file, folder: str = "chat/files", public_id: Optional[str] = None):
    """Upload any file type to Cloudinary"""
    try:
        contents = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ''
        
        # Determine resource type
        if file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']:
            resource_type = "image"
        elif file_extension in ['.mp4', '.mov', '.avi', '.webm', '.mp3', '.wav', '.ogg', '.m4a']:
            resource_type = "video"
        else:
            resource_type = "raw"
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": resource_type,
            "type": "upload",
            "access_mode": "public",
            "use_filename": True,
            "unique_filename": True,
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        result = cloudinary.uploader.upload(contents, **upload_options)
        
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "format": result.get("format", "unknown"),
        }
    except Exception as e:
        print(f"Cloudinary file upload error: {e}")
        raise


async def delete_image(public_id: str):
    """Delete image from Cloudinary"""
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result
    except Exception as e:
        print(f"Cloudinary delete error: {e}")
        raise


def get_image_url(public_id: str, transformations: Optional[str] = None):
    """Get image URL with optional transformations"""
    if transformations:
        return cloudinary.CloudinaryImage(public_id).build_url(
            transformation=transformations,
            secure=True
        )
    return cloudinary.CloudinaryImage(public_id).build_url(secure=True)


def get_thumbnail_url(public_id: str, width: int = 300, height: int = 300):
    """Get thumbnail URL"""
    return get_image_url(public_id, f"w_{width},h_{height},c_fill,q_auto")