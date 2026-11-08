import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

// Custom event to trigger Session Expired Modal in UI
export const SESSION_EXPIRED_EVENT = 'crm_session_expired';

export const triggerSessionExpired = () => {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};

// Axios instance -- base URL aur interceptors ke saath
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor -- har request mein JWT access token attach karo
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor:
// 1. Agar 15-minute access token expire hua (401), toh silently refresh token use karke naya access token lo
// 2. Refresh token 30 days valid rehta hai -- user 30 din tak seamlessly logged in rahega bina interruption ke
// 3. Agar 30 days complete ho gaye (refresh token bhi expire/invalid hua), toh session expired popup show hoga aur logout hoga.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ignore 401 on login endpoints themselves so wrong credentials don't pop session expired modal
    const isLoginEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/unified-login') ||
      originalRequest?.url?.includes('/super-admin/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isLoginEndpoint) {
      if (isRefreshing) {
        // Refresh process already running -- wait in queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setAuth, logout, isSuperAdmin } = useAuthStore.getState();

      // Agar refresh token hi nahi hai, yaani user logged out hai
      if (!refreshToken) {
        logout();
        triggerSessionExpired();
        return Promise.reject(error);
      }

      try {
        const refreshUrl = isSuperAdmin
          ? '/super-admin/auth/refresh'
          : '/auth/refresh';

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}${refreshUrl}`,
          { refreshToken },
        );

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken || refreshToken;

        // Save updated tokens
        setAuth({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token bhi expire ho gaya (yaani 30 days complete ho gaye ya revoked)
        processQueue(refreshError, null);
        logout();
        triggerSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
