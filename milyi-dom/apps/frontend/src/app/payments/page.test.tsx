import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PaymentsPage from './page';

const createPaymentIntentMock = vi.fn();
const confirmPaymentMock = vi.fn();
const getPaymentStatusMock = vi.fn();
const refundPaymentMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../services/payments', () => ({
  createPaymentIntent: (...args: unknown[]) => createPaymentIntentMock(...args),
  confirmPayment: (...args: unknown[]) => confirmPaymentMock(...args),
  getPaymentStatus: (...args: unknown[]) => getPaymentStatusMock(...args),
  refundPayment: (...args: unknown[]) => refundPaymentMock(...args),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../components/ui/require-auth', () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PaymentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'guest-1', role: 'GUEST' },
    });
  });

  it('formats decimal-like amount as currency after intent creation', async () => {
    createPaymentIntentMock.mockResolvedValue({
      confirmationUrl: null,
      clientSecret: null,
      payment: {
        id: 'payment-1',
        bookingId: 'booking-1',
        providerId: 'provider-1',
        status: 'PENDING',
        amount: { s: 1, e: 2, d: [123] },
        currency: 'RUB',
        method: 'manual',
      },
    });

    render(<PaymentsPage />);

    fireEvent.change(screen.getByLabelText('Идентификатор бронирования'), {
      target: { value: 'booking-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать платёжное намерение' }));

    await waitFor(() => {
      expect(createPaymentIntentMock).toHaveBeenCalledWith('booking-1');
    });

    await waitFor(() => {
      expect(screen.getByText(/₽/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/не число/i)).not.toBeInTheDocument();
  });
});
