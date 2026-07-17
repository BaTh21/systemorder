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

# Create upload directories
os.makedirs("uploads/products", exist_ok=True)
os.makedirs("uploads/categories", exist_ok=True)
os.makedirs("uploads/payments", exist_ok=True)

# Create app
app = FastAPI(title="TeleShop API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "TeleShop API is running!",
        "docs": "/docs",
        "api": "/api"
    }

@app.on_event("startup")
async def startup_event():
    try:
        # Try to create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")
        
        # Create admin user
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
                print("✅ Admin user created")
            else:
                print("✅ Admin user already exists")
    except Exception as e:
        print(f"⚠️ Database initialization error: {e}")
        print("   The app will continue running. Database may need manual setup.")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(telegram.router, prefix="/api")