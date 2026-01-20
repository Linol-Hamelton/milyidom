'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export function RequireAuth({ children, roles, redirectTo = '/auth/login' }: RequireAuthProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (roles && user && !roles.includes(user.role)) {
      router.replace('/');
    }
  }, [isAuthenticated, redirectTo, roles, router, user]);

  if (!isAuthenticated) {
    return null;
  }

  if (roles && user && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
