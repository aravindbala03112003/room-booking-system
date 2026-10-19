import axios from 'axios';

// Create configured Axios instance
// Supports relative '/api' (local dev with Vite proxy or Vercel rewrites)
// as well as absolute VITE_API_URL (external backend deployment)
const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
const baseURL = rawBaseUrl
  ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`)
  : '/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT token to every request if available
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hotel_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global 401 Unauthorized responses
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, clear stored auth data
      // Don't auto-redirect on public page requests
      const isAuthUrl = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/signup');
      if (!isAuthUrl) {
        localStorage.removeItem('hotel_token');
        localStorage.removeItem('hotel_user');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
