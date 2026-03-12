'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-sand-50 px-4 text-center">
      <div className="mb-6 text-7xl">⚠️</div>
      <h1 className="text-2xl font-bold text-slate-800">Ошибка в панели администратора</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-500">
        Произошла неожиданная ошибка. Попробуйте обновить страницу.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">Код ошибки: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-pine-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
        >
          Попробовать снова
        </button>
        <Link
          href="/admin"
          className="rounded-full border border-pine-300 px-8 py-3 text-sm font-medium text-pine-700 transition hover:bg-pine-50"
        >
          В панель администратора
        </Link>
      </div>
    </div>
  );
}
