'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </AuthProvider>
  );
}
