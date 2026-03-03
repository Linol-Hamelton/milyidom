'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { createPaymentIntent } from '../../../services/payments';
import { parseError } from '../../../lib/api-client';
import { formatCurrency, decimalToNumber } from '../../../lib/format';
import type { Booking, Payment } from '../../../types/api';
import { api } from '../../../lib/api-client';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Inner checkout form ────────────────────────────────────────────────────
function CheckoutForm({ bookingId, amount, currency }: { bookingId: string; amount: number; currency: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success?bookingId=${bookingId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message ?? 'Платёж не прошёл. Попробуйте ещё раз.');
      } else {
        toast.success('Платёж успешно выполнен!');
        router.push(`/payments/success?bookingId=${bookingId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Данные для оплаты
        </h2>
        <PaymentElement
          options={{
            layout: 'tabs',
            defaultValues: { billingDetails: { address: { country: 'RU' } } },
          }}
        />
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-6 py-4 text-sm text-slate-600">
        <span>Итого к оплате</span>
        <span className="text-xl font-bold text-slate-900">
          {formatCurrency(amount, currency)}
        </span>
      </div>

      <Button
        type="submit"
        className="w-full bg-pine-600 hover:bg-pine-500 rounded-full"
        isLoading={submitting}
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? 'Обрабатываем…' : `Оплатить ${formatCurrency(amount, currency)}`}
      </Button>

      <p className="text-center text-xs text-slate-400">
        Платёж защищён Stripe. Мы не храним данные вашей карты.
      </p>
    </form>
  );
}

// ─── Offline / manual payment fallback ──────────────────────────────────────
function ManualPaymentNotice({ bookingId, message }: { bookingId: string; message?: string }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Бронирование создано!</h2>
      <p className="mt-2 text-sm text-slate-500">
        {message ?? 'Запрос на бронирование отправлен. Хост подтвердит его в ближайшее время.'}
      </p>
      <p className="mt-1 text-xs text-slate-400">ID бронирования: {bookingId}</p>
      <Button
        className="mt-6"
        onClick={() => router.push('/bookings')}
      >
        Мои бронирования
      </Button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PaymentPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const init = async () => {
      setLoading(true);
      try {
        // Load booking info for price display
        const { data: bookingData } = await api.get<Booking>(`/bookings/${bookingId}`);
        setBooking(bookingData);

        // Create payment intent
        const result = await createPaymentIntent(bookingId);
        setPayment(result.payment);

        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
        } else {
          setOfflineMessage(
            result.message ?? 'Бронирование подтверждено. Хост свяжется с вами в ближайшее время.',
          );
        }
      } catch (err) {
        const { message } = parseError(err);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [bookingId]);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-pine-600">
              Безопасная оплата
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              Оформление бронирования
            </h1>
            {booking && (
              <p className="mt-2 text-sm text-slate-500">
                {booking.listing.title} ·{' '}
                {new Date(booking.checkIn).toLocaleDateString('ru-RU', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                —{' '}
                {new Date(booking.checkOut).toLocaleDateString('ru-RU', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && offlineMessage && (
            <ManualPaymentNotice bookingId={bookingId} message={offlineMessage} />
          )}

          {!loading && !error && clientSecret && stripePromise && booking && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#e11d48',
                    colorBackground: '#ffffff',
                    colorText: '#1e293b',
                    borderRadius: '12px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  },
                },
              }}
            >
              <CheckoutForm
                bookingId={bookingId}
                amount={decimalToNumber(booking.totalPrice)}
                currency={booking.currency}
              />
            </Elements>
          )}

          {!loading && !error && clientSecret && !stripePromise && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm text-amber-800">
                <strong>Требуется настройка:</strong> Укажите{' '}
                <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> в файле{' '}
                <code>.env.local</code> для включения приёма карточных платежей.
              </p>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
