import { create } from 'zustand';
import type { User } from '../types/api';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  setAuth: (payload: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  updateUser: (user: Partial<User>) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clear: () => void;
  setLoading: (loading: boolean) => void;
};

const STORAGE_KEY = 'milyi-dom-auth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  setAuth: ({ user, accessToken, refreshToken }) => {
    const payload = { user, accessToken, refreshToken };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
    set({ user, accessToken, refreshToken });
  },
  updateUser: (user) => {
    const current = get();
    if (!current.user) return;
    const updated = { ...current.user, ...user } as User;
    set({ user: updated });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: updated,
          accessToken: current.accessToken,
          refreshToken: current.refreshToken,
        }),
      );
    }
  },
  setTokens: ({ accessToken, refreshToken }) => {
    const current = get();
    set({ accessToken, refreshToken });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: current.user,
          accessToken,
          refreshToken,
        }),
      );
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({ user: null, accessToken: null, refreshToken: null });
  },
  setLoading: (loading) => set({ loading }),
}));

export const restoreAuthFromStorage = () => {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    useAuthStore.getState().setLoading(false);
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    useAuthStore.setState({
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    });
  } catch (error) {
    console.error('Failed to restore auth state', error);
    window.localStorage.removeItem(STORAGE_KEY);
  } finally {
    useAuthStore.getState().setLoading(false);
  }
};
