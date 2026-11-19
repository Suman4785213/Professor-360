import { create } from 'zustand';
import { User, FacultyRegisterPayload } from '../types';
import { apiClient } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, collegeId?: string, isSuperAdmin?: boolean) => Promise<void>;
  registerFaculty: (payload: FacultyRegisterPayload) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: true,

  login: async (email, password, collegeId, isSuperAdmin) => {
    set({ isLoading: true });
    try {
      const payload: Record<string, any> = { email, password };
      if (collegeId) payload.college_id = collegeId;
      if (isSuperAdmin) payload.is_super_admin = true;

      const res = await apiClient.post('/auth/login/', payload);
      const { access, refresh, user } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      if (collegeId) {
        localStorage.setItem('p360_active_college_id', collegeId);
      } else {
        localStorage.removeItem('p360_active_college_id');
      }
      set({ user, token: access, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      const message = err.response?.data?.detail || err.response?.data?.error || 'Login failed. Check email or password.';
      throw new Error(message);
    }
  },

  registerFaculty: async (payload) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post('/auth/register/faculty/', payload);
      const { access, refresh, user } = res.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      set({ user, token: access, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      const errData = err.response?.data?.error?.details || err.response?.data?.details || err.response?.data;
      let message = 'Registration failed. Please verify your details.';
      if (typeof errData === 'object' && errData !== null) {
        const firstKey = Object.keys(errData)[0];
        const firstVal = errData[firstKey];
        message = Array.isArray(firstVal) ? `${firstKey}: ${firstVal[0]}` : String(firstVal);
      } else if (err.response?.data?.detail || err.response?.data?.message) {
        message = err.response.data.detail || err.response.data.message;
      }
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
}));
