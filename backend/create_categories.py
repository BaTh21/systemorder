# create_categories.py
import asyncio
from app.core.database import async_session
from app.models.category import Category
from app.utils import slugify

CATEGORIES = [
    ("Electronics", None),
    ("Smartphones", "electronics"),
    ("Laptops", "electronics"),
    ("Audio", "electronics"),
    ("Fashion", None),
    ("Men's Clothing", "fashion"),
    ("Women's Clothing", "fashion"),
    ("Home & Garden", None),
    ("Kitchen", "home-garden"),
    ("Furniture", "home-garden"),
    ("Sports & Outdoors", None),
    ("Fitness", "sports-outdoors"),
]

async def create():
    async with async_session() as db:
        for name, parent_slug in CATEGORIES:
            # Check if exists
            from sqlalchemy import select
            slug = slugify(name)
            result = await db.execute(select(Category).where(Category.slug == slug))
            if result.scalars().first():
                print(f"⏭️ {name} already exists")
                continue
            
            parent_id = None
            if parent_slug:
                result = await db.execute(select(Category).where(Category.slug == parent_slug))
                parent = result.scalars().first()
                if parent:
                    parent_id = parent.id
            
            cat = Category(name=name, slug=slug, parent_id=parent_id)
            db.add(cat)
            print(f"✅ {name}")
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(create())