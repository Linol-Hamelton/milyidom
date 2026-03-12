import { apiClient } from '@/api/client';

export interface PaymentIntent {
  confirmationUrl: string | null;
  payment: {
    id: string;
    bookingId: string;
    status: string;
    amount: string;
    currency: string;
  };
}

export interface PaymentStatus {
  status: string;
  providerId: string | null;
  amount: string;
  currency: string;
}

export const createPaymentIntent = async (bookingId: string): Promise<PaymentIntent> => {
  const { data } = await apiClient.post<PaymentIntent>('/payments/intent', { bookingId });
  return data;
};

export const getPaymentStatus = async (bookingId: string): Promise<PaymentStatus> => {
  const { data } = await apiClient.get<PaymentStatus>(`/payments/${bookingId}/status`);
  return data;
};
