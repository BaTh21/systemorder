// src/utils/imageHelper.js

export const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
        return getPlaceholderImage();
    }
    
    // Cloudinary URLs are already full HTTPS URLs - return as is
    // Example: https://res.cloudinary.com/vck8ep1r/image/upload/v123/teleshop/products/...
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // For any remaining local paths (backward compatibility)
    if (imageUrl.startsWith('/')) {
        return `http://localhost:8000${imageUrl}`;
    }
    
    return `http://localhost:8000/${imageUrl}`;
};

export const getPlaceholderImage = (w = 300, h = 300) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="#E8E8E8"/>
        <rect x="4" y="4" width="${w-8}" height="${h-8}" fill="#F8F8F8" stroke="#DDD" stroke-width="1"/>
        <text x="${w/2}" y="${h/2-5}" font-family="Arial" font-size="14" fill="#AAA" text-anchor="middle">No Image</text>
        <text x="${w/2}" y="${h/2+15}" font-family="Arial" font-size="11" fill="#CCC" text-anchor="middle">Available</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const handleImageError = (event) => {
    event.target.src = getPlaceholderImage();
    event.target.onerror = null;
};