# app/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.notification_service import NotificationService
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/notifications", tags=["notifications"])


class MarkReadRequest(BaseModel):
    notification_ids: Optional[List[int]] = None


@router.get("")
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's notifications"""
    
    notifications = await NotificationService.get_user_notifications(
        user_id=current_user.id,
        limit=limit,
        unread_only=unread_only,
        db=db
    )
    
    # Get unread count
    all_notifications = await NotificationService.get_user_notifications(
        user_id=current_user.id,
        limit=999,
        unread_only=True,
        db=db
    )
    
    return {
        "items": notifications,
        "unread_count": len(all_notifications),
        "total": len(notifications)
    }


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    
    success = await NotificationService.mark_notification_as_read(
        notification_id=notification_id,
        user_id=current_user.id,
        db=db
    )
    
    if not success:
        raise HTTPException(404, "Notification not found")
    
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read"""
    
    count = await NotificationService.mark_all_as_read(
        user_id=current_user.id,
        db=db
    )
    
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a notification"""
    
    success = await NotificationService.delete_notification(
        notification_id=notification_id,
        user_id=current_user.id,
        db=db
    )
    
    if not success:
        raise HTTPException(404, "Notification not found")
    
    return {"message": "Notification deleted"}


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread notification count"""
    
    notifications = await NotificationService.get_user_notifications(
        user_id=current_user.id,
        limit=999,
        unread_only=True,
        db=db
    )
    
    return {"unread_count": len(notifications)}