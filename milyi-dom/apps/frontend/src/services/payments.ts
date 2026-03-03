import { api } from '../lib/api-client';
import type { Payment } from '../types/api';

export async function createPaymentIntent(bookingId: string) {
  const { data } = await api.post('/payments/intent', { bookingId });
  return data as {
    confirmationUrl: string | null;
    clientSecret: string | null;
    payment: Payment;
    message?: string;
  };
}

export async function confirmPayment(bookingId: string) {
  const { data } = await api.patch<Payment>(`/payments/${bookingId}/confirm`, {});
  return data;
}

export async function getPaymentStatus(bookingId: string) {
  const { data } = await api.get<Payment | null>(`/payments/${bookingId}/status`);
  return data;
}

export async function refundPayment(bookingId: string) {
  const { data } = await api.patch<Payment>(`/payments/${bookingId}/refund`, {});
  return data;
}

export async function getHostEarnings(period: 'week' | 'month' | 'year' = 'month') {
  const { data } = await api.get<{ totalAmount: number; totalBookings: number; period: string }>(
    `/payments/host/earnings?period=${period}`,
  );
  return data;
}

export async function savePayoutPhone(phone: string) {
  const { data } = await api.patch<{ phone: string }>('/payments/payout-phone', { phone });
  return data;
}

export async function getPayoutStatus() {
  const { data } = await api.get<{ hasPayoutMethod: boolean; phone: string | null }>(
    '/payments/payout-status',
  );
  return data;
}
