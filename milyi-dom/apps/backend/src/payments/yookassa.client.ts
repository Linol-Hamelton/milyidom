import { randomUUID } from 'crypto';

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
}

export interface YooKassaPayout {
  id: string;
  status: 'pending' | 'succeeded' | 'canceled';
  amount: { value: string; currency: string };
}

export class YooKassaClient {
  private readonly auth: string;
  private readonly payoutAuth: string;

  constructor(shopId: string, secretKey: string, payoutToken: string) {
    this.auth = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    // Payout API uses OAuth token directly
    this.payoutAuth = payoutToken ? `Bearer ${payoutToken}` : '';
  }

  private async request<T>(
    url: string,
    method: string,
    body?: unknown,
    auth?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: auth ?? this.auth,
      'Idempotence-Key': randomUUID(),
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YooKassa API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** Create a payment with redirect confirmation flow */
  async createPayment(
    amountRub: number,
    bookingId: string,
    description: string,
    returnUrl: string,
  ): Promise<{ id: string; confirmationUrl: string }> {
    const payment = await this.request<YooKassaPayment>(
      'https://api.yookassa.ru/v3/payments',
      'POST',
      {
        amount: { value: amountRub.toFixed(2), currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        description,
        metadata: { bookingId },
        capture: true,
      },
    );
    const confirmationUrl = payment.confirmation?.confirmation_url ?? '';
    return { id: payment.id, confirmationUrl };
  }

  /** Get payment status by YooKassa payment ID */
  async getPayment(paymentId: string): Promise<YooKassaPayment> {
    return this.request<YooKassaPayment>(
      `https://api.yookassa.ru/v3/payments/${paymentId}`,
      'GET',
    );
  }

  /** Create a full refund for a payment */
  async refundPayment(paymentId: string, amountRub: number): Promise<void> {
    await this.request(
      'https://api.yookassa.ru/v3/refunds',
      'POST',
      {
        payment_id: paymentId,
        amount: { value: amountRub.toFixed(2), currency: 'RUB' },
      },
    );
  }

  /** Send a payout to a phone number via SBP */
  async createPayout(
    amountRub: number,
    phone: string,
    description: string,
  ): Promise<YooKassaPayout> {
    return this.request<YooKassaPayout>(
      'https://payouts.yookassa.ru/v3/payouts',
      'POST',
      {
        amount: { value: amountRub.toFixed(2), currency: 'RUB' },
        payout_destination_data: {
          type: 'sbp',
          phone,
        },
        description,
      },
      this.payoutAuth,
    );
  }
}
