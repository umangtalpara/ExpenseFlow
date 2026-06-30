import { create } from 'zustand';
import api from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (dto: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          set({
            accessToken: token,
            user: JSON.parse(userStr),
            isAuthenticated: true,
          });
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
        }
      }
    }
    set({ isLoading: false });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
      }
      set({ accessToken, user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (dto) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/signup', dto);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
