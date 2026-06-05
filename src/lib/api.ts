import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const getToken = (): string | null => {
  // Try Zustand store first
  const storeToken = useAuthStore.getState().token;
  if (storeToken) return storeToken;

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const persisted = localStorage.getItem('hr-auth');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        return parsed?.state?.token || parsed?.token || null;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

const getBaseURL = (): string => {
  // Use environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Fixed backend URL - use 127.0.0.1 consistently
  return 'http://localhost:8000/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Network error (no response)
    if (!error.response) {
      console.warn('Network unavailable:', error.message);
      error.message = 'Unable to connect to server. Please check if backend is running.';
      return Promise.reject(error);
    }

    // 401 Unauthorized - redirect to login
    if (error.response.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default api;