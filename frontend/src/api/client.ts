import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Share one refresh operation across concurrent expired requests.
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login/')) {
      originalRequest._retry = true;
      const currentToken = localStorage.getItem('access_token');
      if (currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`) {
        originalRequest.headers.Authorization = `Bearer ${currentToken}`;
        return apiClient(originalRequest);
      }
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios.post(`${API_BASE}/auth/refresh/`, { refresh: refreshToken })
              .then((res) => {
                // A logout or account change must not be undone by an in-flight refresh.
                if (localStorage.getItem('refresh_token') !== refreshToken) {
                  throw new Error('Session changed');
                }
                localStorage.setItem('access_token', res.data.access);
                if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh);
                return res.data.access as string;
              }).finally(() => { refreshPromise = null; });
          }
          const access = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } catch {
          if (localStorage.getItem('refresh_token') === refreshToken) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
