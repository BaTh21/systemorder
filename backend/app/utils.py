import re
import unicodedata
from typing import Optional

def slugify(value: str, allow_unicode: bool = False) -> str:
    """
    Convert a string to a URL-friendly slug.
    Example: "Hello World!" -> "hello-world"
    """
    value = str(value)
    if allow_unicode:
        value = unicodedata.normalize('NFKC', value)
    else:
        value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value.lower()).strip()
    return re.sub(r'[-\s]+', '-', value)

def generate_unique_slug(text: str, existing_slugs: Optional[set] = None) -> str:
    """Generate a unique slug; append incremental number if needed."""
    base_slug = slugify(text)
    slug = base_slug
    if existing_slugs is not None:
        counter = 1
        while slug in existing_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
    return slug

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}

def validate_image_extension(filename: str) -> bool:
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS