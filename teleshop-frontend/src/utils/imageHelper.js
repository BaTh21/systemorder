// src/utils/imageHelper.js

// Hard-code the URL - no process.env needed
const API_BASE_URL = 'http://localhost:8000';

export const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
        return getPlaceholderImage();
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    if (imageUrl.startsWith('/')) {
        return `${API_BASE_URL}${imageUrl}`;
    }
    
    return `${API_BASE_URL}/${imageUrl}`;
};

export const getPlaceholderImage = (width = 300, height = 300) => {
    return `https://via.placeholder.com/${width}x${height}/E0E0E0/999999?text=No+Image`;
};

export const handleImageError = (event) => {
    event.target.src = getPlaceholderImage();
    event.target.onerror = null;
};