import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const parseData = (data: any) => {
  if (typeof data === 'string') {
    try {
      const match = data.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {}
  }
  return data;
};

const api = axios.create({
  // FIXED: Keep the base URL clean. We will manage versioning prefixes inside the routes definitions cleanly.
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // FIXED: Instead of hitting slower local storage lookups, read directly from active store memory state
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    response.data = parseData(response.data);
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // FIXED: Call the centralized state cleaner instead of loose manual deletions
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;