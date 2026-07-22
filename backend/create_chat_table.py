# create_chat_table.py
import asyncio
from app.core.database import engine
from app.models.base import Base
from app.models.chat import ChatMessage

async def create_table():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Chat messages table created!")

asyncio.run(create_table())