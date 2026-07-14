# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, products, categories, cart, orders, admin, telegram
from app.core.database import engine, async_session
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select
import httpx
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="TeleShop API")
# Create upload directories
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/categories", exist_ok=True)
os.makedirs("uploads/payments", exist_ok=True)

app = FastAPI(title="TeleShop API")

# Mount static files - MUST be before CORS middleware
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
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
    
    # Set Telegram webhook
    await setup_telegram_webhook()

async def setup_telegram_webhook():
    """Set up Telegram webhook on startup"""
    webhook_url = f"https://your-domain.com/api/telegram/webhook"
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json={"url": webhook_url})
            result = response.json()
            if result.get("ok"):
                print("✅ Telegram webhook set successfully")
            else:
                print(f"❌ Failed to set webhook: {result}")
        except Exception as e:
            print(f"❌ Error setting webhook: {e}")

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(telegram.router, prefix="/api")