# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.routers import auth, products, categories, cart, orders, admin, telegram
from app.core.database import engine, async_session, DATABASE_URL
from app.models.base import Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select, create_engine, text
import os
import asyncio

from app.routers import contact
from app.routers import payment
from app.routers import chat_ws
from app.routers import chat

# Create upload directories
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/categories", exist_ok=True)
os.makedirs("uploads/payments", exist_ok=True)

app = FastAPI(title="TeleShop API")

# CORS - Use hardcoded list to avoid any config issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://systemorder.vercel.app",
        "https://www.systemorder.vercel.app",
        "https://systemorder-git-main.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "TeleShop API is running!", "docs": "/docs"}

def create_database_if_not_exists():
    """Create database if it doesn't exist"""
    try:
        sync_url = DATABASE_URL.replace("+asyncpg", "")
        db_name = sync_url.split("/")[-1].split("?")[0]
        base_url = sync_url.rsplit("/", 1)[0] + "/postgres"
        
        sync_engine = create_engine(base_url)
        with sync_engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"))
            if not result.fetchone():
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"✅ Database '{db_name}' created!")
            else:
                print(f"✅ Database '{db_name}' already exists")
        sync_engine.dispose()
        return True
    except Exception as e:
        print(f"⚠️ Could not auto-create database: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    create_database_if_not_exists()
    
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created")
        
        async with async_session() as db:
            result = await db.execute(select(User).where(User.role == UserRole.admin))
            if not result.scalars().first():
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
                print("✅ Admin user created")
    except Exception as e:
        print(f"⚠️ Startup error: {e}")

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(telegram.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(payment.router, prefix="/api")
app.include_router(chat_ws.router)
app.include_router(chat.router, prefix="/api")