import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  organization: string;
  role: string;
  name?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const isClient = typeof window !== 'undefined';

  return {
    accessToken: isClient ? localStorage.getItem('access_token') : null,
    refreshToken: isClient ? localStorage.getItem('refresh_token') : null,
    user: isClient && localStorage.getItem('auth_user') 
      ? JSON.parse(localStorage.getItem('auth_user') || '{}') 
      : null,
    isAuthenticated: isClient ? !!localStorage.getItem('access_token') : false,

    setAuth: (accessToken, refreshToken, user) => {
      if (isClient) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
      set({ accessToken, refreshToken, user, isAuthenticated: true });
    },

    clearAuth: () => {
      if (isClient) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
      }
      set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
    },
  };
});
