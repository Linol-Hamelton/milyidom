import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { login, register, fetchMe, type AuthUser } from '../services/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        const user = await fetchMe();
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      await SecureStore.deleteItemAsync('access_token');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { access_token } = await login(email, password);
    await SecureStore.setItemAsync('access_token', access_token);
    const user = await fetchMe();
    set({ user, token: access_token, isAuthenticated: true });
  },

  register: async (email, password, firstName, lastName) => {
    const { access_token } = await register(email, password, firstName, lastName);
    await SecureStore.setItemAsync('access_token', access_token);
    const user = await fetchMe();
    set({ user, token: access_token, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
