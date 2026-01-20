'use client';

import { useEffect } from 'react';
import { restoreAuthFromStorage, useAuthStore } from '../store/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const loading = useAuthStore((state) => state.loading);
  useEffect(() => {
    restoreAuthFromStorage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pine-600" />
      </div>
    );
  }

  return <>{children}</>;
}
