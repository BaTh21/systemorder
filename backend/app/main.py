from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, products, categories, cart, orders, admin
from app.core.database import engine, async_session
from app.models.base import Base
from app.routers import telegram
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

app = FastAPI(title="TeleShop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-create admin user
    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.admin))
        admin_user = result.scalars().first()
        
        if not admin_user:
            admin = User(
                email="admin@gmail.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin",
                phone="15274578",
                role=UserRole.admin,
                is_active=True
            )
            db.add(admin)
            await db.commit()

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(telegram.router, prefix="/api")