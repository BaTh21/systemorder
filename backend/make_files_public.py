import asyncio
import re
import unicodedata
from app.core.database import async_session
from app.models.chat import ChatMessage
from sqlalchemy import select
import json

def sanitize_filename(filename):
    """Remove non-ASCII characters from filename"""
    if not filename:
        return "file.pdf"
    filename = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    if '.' not in filename:
        filename = filename + '.pdf'
    return filename

async def fix_filenames():
    async with async_session() as db:
        result = await db.execute(
            select(ChatMessage).where(ChatMessage.message_type == "file")
        )
        messages = result.scalars().all()
        
        for msg in messages:
            try:
                file_data = json.loads(msg.message)
                old_name = file_data.get("name", "file.pdf")
                new_name = sanitize_filename(old_name)
                
                if old_name != new_name:
                    file_data["name"] = new_name
                    msg.message = json.dumps(file_data)
                    print(f"Fixed: {old_name} -> {new_name}")
            except Exception as e:
                print(f"Error fixing message {msg.id}: {e}")
        
        await db.commit()
        print("Done!")

asyncio.run(fix_filenames())