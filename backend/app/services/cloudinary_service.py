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
    Upload image to Cloudinary (for product images, avatars, chat images)
    
    Args:
        file: UploadFile from FastAPI
        folder: Folder name in Cloudinary (products, categories, payments, chat/images)
        public_id: Optional custom public ID
    
    Returns:
        dict: Upload result with url and public_id
    """
    try:
        contents = await file.read()
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "image",
            "quality": "auto",
            "fetch_format": "auto",
            "format": file_extension.replace('.', ''),
        }
        
        if public_id:
            upload_options["public_id"] = public_id
        
        result = cloudinary.uploader.upload(contents, **upload_options)
        
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


async def upload_voice(file, folder: str = "chat/voice", public_id: Optional[str] = None):
    """
    Upload voice/audio file to Cloudinary as MP3
    """
    try:
        contents = await file.read()
        
        # Generate unique filename with .mp3 extension
        import time
        filename = f"voice_{int(time.time())}.mp3"
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "video",
            "format": "mp3",
            "public_id": public_id or filename.replace('.mp3', ''),
            "overwrite": True,
        }
        
        result = cloudinary.uploader.upload(contents, **upload_options)
        
        # Force .mp3 in the URL
        secure_url = result["secure_url"]
        if not secure_url.endswith('.mp3'):
            secure_url = secure_url.rsplit('.', 1)[0] + '.mp3'
        
        return {
            "url": secure_url,
            "public_id": result["public_id"],
            "format": "mp3",
        }
    except Exception as e:
        print(f"Cloudinary voice upload error: {e}")
        
        # Fallback: save as MP3 locally
        try:
            import os
            os.makedirs("uploads/chat/voice", exist_ok=True)
            filename = f"voice_{public_id or 'audio'}_{int(__import__('time').time())}.mp3"
            filepath = f"uploads/chat/voice/{filename}"
            with open(filepath, "wb") as f:
                f.write(contents)
            
            return {
                "url": f"/uploads/chat/voice/{filename}",
                "public_id": filename,
                "format": "mp3",
            }
        except Exception as fallback_error:
            print(f"Fallback error: {fallback_error}")
            raise e


async def upload_file_attachment(file, folder: str = "chat/files", public_id: Optional[str] = None):
    """
    Upload any file type to Cloudinary (PDF, DOC, ZIP, etc.)
    
    Args:
        file: UploadFile from FastAPI
        folder: Folder name in Cloudinary
        public_id: Optional custom public ID
    
    Returns:
        dict: Upload result with url and public_id
    """
    try:
        contents = await file.read()
        
        upload_options = {
            "folder": f"teleshop/{folder}",
            "resource_type": "auto",  # Auto-detect: image, video, or raw
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