# create_avatar_column.py
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def add_avatar_column():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)"
        ))
        print("✅ avatar_url column added")

asyncio.run(add_avatar_column())