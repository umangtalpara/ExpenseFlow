import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT tokens into authenticated requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Automatically handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (
          pathname !== '/login' &&
          pathname !== '/signup' &&
          pathname !== '/forgot-password' &&
          pathname !== '/reset-password' &&
          pathname !== '/accept-invite'
        ) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
