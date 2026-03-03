'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '../../../components/ui/button';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-soft">
        {/* Animated checkmark */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-slate-900">
          Платёж выполнен!
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Бронирование подтверждено. Хост получит уведомление и пришлёт вам инструкции по заселению.
        </p>

        {bookingId && (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-400">
            ID бронирования: <span className="font-mono">{bookingId}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => router.push('/bookings')}
            className="bg-pine-600 hover:bg-pine-500 rounded-full"
          >
            Мои бронирования
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine-200 border-t-pine-600" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
