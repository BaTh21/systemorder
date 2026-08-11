from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from pydantic import BaseModel
from app.core.deps import admin_required, get_current_user
from app.core.config import settings
from app.schemas.auth import UserUpdate, AdminUserApproval
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token
)
from app.services.notification_service import send_account_approved_notification, send_account_rejected_notification
from app.services.telegram import send_telegram_message


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/register")
async def register(
    data: UserRegister, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user - requires admin approval"""
    
    print(f"📝 Registration attempt: {data.email}")
    print(f"   Full name: {data.full_name}")
    print(f"   Phone: {data.phone}")
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalars().first():
        raise HTTPException(400, "Email already registered")
    
    # Check if phone exists
    result = await db.execute(select(User).where(User.phone == data.phone))
    if result.scalars().first():
        raise HTTPException(400, "Phone number already registered")
    
    # Create user
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.customer,
        status=UserStatus.pending,
        is_active=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    print(f"✅ User created: ID={user.id}, Name={user.full_name}")
    
    # Notify admins (optional)
    if settings.TELEGRAM_ADMIN_CHAT_ID:
        from app.services.telegram import send_telegram_message
        background_tasks.add_task(
            send_telegram_message,
            settings.TELEGRAM_ADMIN_CHAT_ID,
            f"""
🆕 <b>New User Registration Pending</b>

👤 <b>Name:</b> {user.full_name}
📧 <b>Email:</b> {user.email}
📱 <b>Phone:</b> {user.phone}
🆔 <b>User ID:</b> {user.id}

🔗 <b>Approve:</b> Go to Admin Dashboard
"""
        )
    
    return {
        "message": "Registration successful! Your account is pending admin approval.",
        "user_id": user.id,
        "status": "pending",
        "requires_admin_approval": True
    }


# ============================================
# LOGIN
# ============================================
@router.post("/login", response_model=Token)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user - check approval status"""
    
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(401, "Invalid credentials")
    
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    
    # Check approval status
    if user.status == UserStatus.pending:
        raise HTTPException(
            403, 
            "⏳ Your account is pending admin approval. You will be notified via Telegram once approved."
        )
    
    if user.status == UserStatus.rejected:
        raise HTTPException(
            403, 
            f"❌ Your account was not approved: {user.rejection_reason or 'No reason provided'}"
        )
    
    if user.status == UserStatus.suspended:
        raise HTTPException(403, "Your account has been suspended. Please contact support.")
    
    if not user.is_active:
        raise HTTPException(403, "Your account is inactive. Please contact support.")
    
    token = create_access_token({"sub": str(user.id)})
    
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
    data: ProfileUpdate, 
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    
    # Update fields if provided
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
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

# ============================================
# ADMIN: Approve User
# ============================================
@router.put("/admin/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    data: AdminUserApproval,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Admin: Approve or reject a user - Sends Telegram & In-App notifications"""
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(404, "User not found")
    
    if user.status != UserStatus.pending:
        raise HTTPException(400, f"User is already {user.status.value}")
    
    # Update user status
    new_status = UserStatus(data.status)
    user.status = new_status
    user.approved_by_id = current_user.id
    user.approved_at = datetime.utcnow()
    
    if data.rejection_reason and data.status == 'rejected':
        user.rejection_reason = data.rejection_reason
    
    await db.commit()
    await db.refresh(user)
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SEND NOTIFICATIONS (Telegram + In-App)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if data.status == 'approved':
        # Send account approved notification
        background_tasks.add_task(
            send_account_approved_notification,
            user.id,
            user.full_name
        )
    else:
        # Send account rejected notification
        background_tasks.add_task(
            send_account_rejected_notification,
            user.id,
            user.full_name,
            data.rejection_reason or "No reason provided"
        )
    
    # Notify admin who made the decision
    if settings.TELEGRAM_ADMIN_CHAT_ID:
        admin_message = f"""
📋 <b>User {user.status.value.upper()}</b>

👤 <b>User:</b> {user.full_name}
📧 <b>Email:</b> {user.email}
📱 <b>Phone:</b> {user.phone}
🆔 <b>ID:</b> {user.id}
👨‍💼 <b>Approved by:</b> {current_user.full_name}

Status: {"✅ Approved" if user.status == UserStatus.approved else "❌ Rejected"}
{f"📝 Reason: {data.rejection_reason}" if data.status == 'rejected' else ""}
"""
        background_tasks.add_task(
            send_telegram_message,
            settings.TELEGRAM_ADMIN_CHAT_ID,
            admin_message
        )
    
    return {
        "message": f"User {user.status.value} successfully",
        "user_id": user.id,
        "status": user.status.value,
        "notifications_sent": {
            "in_app": True,
            "telegram": bool(user.telegram_chat_id)
        }
    }


# ============================================
# HELPER: Notify Admins
# ============================================
async def notify_admins_new_user(user_id: int, full_name: str, email: str, phone: str):
    """Notify all admins about new registration via Telegram"""
    
    from app.core.database import async_session
    
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.role == UserRole.admin)
        )
        admins = result.scalars().all()
        
        message = f"""
🆕 <b>New User Registration Pending</b>

👤 <b>Name:</b> {full_name}
📧 <b>Email:</b> {email}
📱 <b>Phone:</b> {phone}
🆔 <b>User ID:</b> {user_id}

🔗 <b>Approve:</b> /admin/pending-users

<i>Please review and approve the user.</i>
"""
        
        for admin in admins:
            if admin.telegram_chat_id:
                await send_telegram_message(admin.telegram_chat_id, message)
                

@router.post("/register")
async def register(
    request: Request,  # ✅ Add this
    data: UserRegister,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Get raw body for debugging
    body = await request.body()
    print(f"📝 Raw request body: {body}")
    
    # Log parsed data
    print(f"📝 Parsed data: {data}")
    print(f"   Email: {data.email}")
    print(f"   Full name: {data.full_name}")
    print(f"   Phone: {data.phone}")
    print(f"   Password length: {len(data.password)}")