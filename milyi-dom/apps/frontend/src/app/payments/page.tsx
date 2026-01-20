"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentStatus,
  refundPayment,
} from '../../services/payments';
import type { Payment } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

export default function PaymentsPage() {
  const { isAuthenticated } = useAuth();
  const [bookingId, setBookingId] = useState('');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureBookingId = () => {
    if (!bookingId) {
      toast.error('Укажите идентификатор бронирования');
      return false;
    }
    if (!isAuthenticated) {
      toast.error('Авторизуйтесь, чтобы управлять платежами');
      return false;
    }
    return true;
  };

  const handleCreateIntent = async () => {
    if (!ensureBookingId()) return;
    setLoading(true);
    try {
      const data = await createPaymentIntent(bookingId);
      setPayment(data.payment);
      setClientSecret(data.clientSecret ?? null);
      toast.success(data.message ?? 'Платёжное намерение создано');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!ensureBookingId()) return;
    setLoading(true);
    try {
      const status = await getPaymentStatus(bookingId);
      setPayment(status);
      setClientSecret(null);
      toast.success(status ? `Статус: ${status.status}` : 'Платёж пока не создан');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!ensureBookingId()) return;
    setLoading(true);
    try {
      const confirmed = await confirmPayment(bookingId);
      setPayment(confirmed);
      toast.success('Платёж подтверждён');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!ensureBookingId()) return;
    setLoading(true);
    try {
      const refunded = await refundPayment(bookingId);
      setPayment(refunded);
      toast.success('Возврат оформлен');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequireAuth>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-lg px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Платежи</p>
            <h1 className="text-3xl font-serif text-slate-900">Оплата и возвраты по бронированиям</h1>
            <p className="text-sm text-slate-600">
              Управляйте оплатой: создавайте платёжные намерения, подтверждайте списания и запрашивайте возврат.
            </p>
          </header>

          <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
            <div className="grid gap-3 sm:grid-cols-[2fr_auto] sm:items-end">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Идентификатор бронирования
                <Input value={bookingId} onChange={(event) => setBookingId(event.target.value)} />
              </label>
              <Button onClick={handleCreateIntent} disabled={loading}>
                Создать платёжное намерение
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="ghost" onClick={handleCheckStatus} disabled={loading}>
                Проверить статус
              </Button>
              <Button variant="ghost" onClick={handleConfirm} disabled={loading}>
                Подтвердить оплату
              </Button>
              <Button variant="ghost" onClick={handleRefund} disabled={loading}>
                Оформить возврат
              </Button>
            </div>
          </section>

          {payment && (
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-slate-900">Информация о платеже</h2>
              <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>ID</dt>
                  <dd className="text-slate-900">{payment.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Статус</dt>
                  <dd className="text-slate-900">{payment.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Сумма</dt>
                  <dd className="text-slate-900">
                    {Number(payment.amount).toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: payment.currency,
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Способ</dt>
                  <dd className="text-slate-900">{payment.method}</dd>
                </div>
                {payment.receiptUrl && (
                  <div className="flex justify-between">
                    <dt>Квитанция</dt>
                    <dd>
                      <a href={payment.receiptUrl} className="text-pine-600" target="_blank" rel="noreferrer">
                        Открыть квитанцию
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {clientSecret && (
            <section className="mt-6 rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-slate-900">Client Secret</h2>
              <p className="mt-2 break-all text-sm text-slate-500">{clientSecret}</p>
            </section>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
