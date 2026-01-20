import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api';

export const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 10000,
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !accessToken.startsWith('offline-access-') && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RetriableRequest = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequest | undefined;

    if (error.response?.status === 403) {
      return Promise.reject(error);
    }

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const { refreshToken } = useAuthStore.getState();

    if (!refreshToken) {
      useAuthStore.getState().clear();
      return Promise.reject(error);
    }

    if (refreshToken.startsWith('offline-refresh-')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(
        `${baseURL}/auth/refresh`,
        { refreshToken },
        { withCredentials: false },
      );
      const { accessToken, refreshToken: newRefreshToken, user } = response.data;
      useAuthStore.getState().setAuth({
        user: user ?? useAuthStore.getState().user!,
        accessToken,
        refreshToken: newRefreshToken,
      });
      processQueue(null, accessToken);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clear();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Please try again later.';

export const parseError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message ||
      error.message ||
      FALLBACK_ERROR_MESSAGE;
    return {
      message: Array.isArray(message) ? message.join(', ') : message,
      status: error.response?.status,
      details: error.response?.data,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: FALLBACK_ERROR_MESSAGE };
};

