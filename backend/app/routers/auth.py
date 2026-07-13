from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
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
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at)
    }