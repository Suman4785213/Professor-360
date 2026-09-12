import { create } from 'zustand';
import { User } from '../types';
import { apiClient } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  switchDemoRole: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post('/auth/login/', { email, password });
      const { access, refresh, user } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      set({ user, token: access, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      const message = err.response?.data?.detail || err.response?.data?.error || 'Login failed. Check email or password.';
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const res = await apiClient.get('/auth/me/');
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  switchDemoRole: async (email: string) => {
    // Quick role switch for live testing all 6 user roles
    const password = email === 'admin@iqac.local' ? 'admin123' : 'demo123';
    await get().login(email, password);
  },
}));
