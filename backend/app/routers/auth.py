from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.schemas.auth import UserUpdate
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token
)
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token
)


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post(
    "/register",
    response_model=Token
)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(
            User.email == data.email
        )
    )

    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone
    )


    db.add(user)

    await db.commit()

    await db.refresh(user)


    token = create_access_token(
        {
            "sub": str(user.id)
        }
    )


    return {
        "access_token": token,
        "token_type": "bearer"
    }



@router.post(
    "/login",
    response_model=Token
)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(
            User.email == data.email
        )
    )

    user = result.scalars().first()


    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )


    if not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )


    token = create_access_token(
        {
            "sub": str(user.id)
        }
    )


    print("LOGIN USER:", user.id)
    print("JWT CREATED:", token)


    return {
        "access_token": token,
        "token_type": "bearer"
    }



@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "telegram_chat_id": current_user.telegram_chat_id,
        "avatar_url": current_user.avatar_url,
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at)
    }
    
@router.put("/profile")
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    
    # Update fields if provided
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.phone is not None:
        current_user.phone = data.phone
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "message": "Profile updated successfully"
    }


@router.put("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""

    # Verify current password
    if not verify_password(data.current_password, current_user.hashed_password):
        print("   ❌ Current password is incorrect")
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Update password
    current_user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    
    print(f"   ✅ Password changed successfully")
    
    return {"message": "Password changed successfully"}

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload profile picture to Cloudinary"""
    
    if not file or not file.filename:
        raise HTTPException(400, "No file uploaded")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Only JPG, PNG, GIF, and WebP images are allowed")
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "File size must be less than 5MB")
    
    # Upload to Cloudinary
    try:
        from app.services.cloudinary_service import upload_image
        
        # Reset file position
        await file.seek(0)
        
        result = await upload_image(
            file,
            folder="avatars",
            public_id=f"user_{current_user.id}"
        )
        
        # Update user's avatar URL
        current_user.avatar_url = result["url"]
        await db.commit()
        
        return {
            "message": "Profile picture uploaded",
            "avatar_url": result["url"]
        }
        
    except Exception as e:
        print(f"Avatar upload error: {e}")
        raise HTTPException(500, f"Upload failed: {str(e)}")

