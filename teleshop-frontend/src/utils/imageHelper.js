// src/utils/imageHelper.js

export const getImageUrl = (imageUrl) => {
    if (!imageUrl) return getPlaceholderImage();
    
    // Full URLs - return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // Use VITE_API_URL or VITE_BACKEND_URL
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
    if (imageUrl.startsWith('/')) {
        return `${API_BASE_URL}${imageUrl}`;
    }
    
    return `${API_BASE_URL}/${imageUrl}`;
};

export const getPlaceholderImage = (w = 300, h = 300) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="${w}" height="${h}" fill="#E8E8E8"/>
        <text x="${w/2}" y="${h/2}" font-family="Arial" font-size="14" fill="#AAA" text-anchor="middle" dominant-baseline="middle">No Image</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};