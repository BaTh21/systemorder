// src/api/axios.js
import axios from 'axios';

// Make sure VITE_API_URL ends with /api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Clean the URL
const baseURL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

console.log('🔗 API Base URL:', baseURL);

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = 'Bearer ' + token;
        }
        console.log('📤 Request:', config.method?.toUpperCase(), config.baseURL + config.url);
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle errors
api.interceptors.response.use(
    (response) => {
        console.log('📥 Response:', response.status, response.config.url);
        return response;
    },
    (error) => {
        console.error('❌ API Error:', error.response?.status, error.config?.url);
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('access_token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;