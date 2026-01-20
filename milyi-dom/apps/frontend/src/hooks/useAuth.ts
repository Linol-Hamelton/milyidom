'use client';

import { useMemo } from 'react';
import { useAuthStore } from '../store/auth-store';

export function useAuth() {
  const { user, accessToken, refreshToken, setAuth, updateUser, setTokens, clear } = useAuthStore();

  return useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      setAuth,
      updateUser,
      setTokens,
      logout: clear,
    }),
    [user, accessToken, refreshToken, setAuth, updateUser, setTokens, clear],
  );
}
