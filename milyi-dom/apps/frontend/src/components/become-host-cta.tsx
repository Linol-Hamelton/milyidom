'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/auth-store';
import { api } from '../lib/api-client';

export function BecomeHostCta({ className }: { className?: string }) {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already a host or admin — go straight to listing creation
  if (!user || user.role === 'HOST' || user.role === 'ADMIN') {
    return (
      <Link
        href="/host/listings/new"
        className={className ?? 'rounded-full bg-white px-8 py-3 text-base font-semibold text-pine-700 shadow-lg transition hover:bg-pine-50'}
      >
        Создать объявление →
      </Link>
    );
  }

  async function handleBecomeHost() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ id: string; email: string; role: string }>('/users/me/become-host');
      updateUser({ role: data.role as 'HOST' });
      router.push('/host/listings/new');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleBecomeHost}
        disabled={loading}
        className={className ?? 'rounded-full bg-white px-8 py-3 text-base font-semibold text-pine-700 shadow-lg transition hover:bg-pine-50 disabled:opacity-60'}
      >
        {loading ? 'Оформляем...' : 'Стать хостом →'}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
