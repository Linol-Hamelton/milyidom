'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth-store';
import { api } from '../../../lib/api-client';
import type { User } from '../../../types/api';

// Handles the redirect after Google / VK OAuth login.
// Backend sends:  /auth/oauth-callback?accessToken=...&refreshToken=...
// We store the tokens, fetch the user profile, then redirect to home.
export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, clear } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/auth/login?error=oauth_failed');
      return;
    }

    // Store tokens first so the api interceptor can send the Authorization header
    useAuthStore.setState({ accessToken, refreshToken });

    api
      .get<User>('/users/me')
      .then(({ data }) => {
        setAuth({ user: data, accessToken, refreshToken });
        router.replace('/');
      })
      .catch(() => {
        clear();
        router.replace('/auth/login?error=oauth_failed');
      });
  }, [searchParams, router, setAuth, clear]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Выполняем вход…</p>
      </div>
    </div>
  );
}
