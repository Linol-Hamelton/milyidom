import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { MarkPaymentDto } from './dto/mark-payment.dto';

const stripeApiVersion: Stripe.StripeConfig['apiVersion'] = '2025-08-27.basil';

@Injectable()
export class PaymentsService {
  private readonly stripe?: Stripe;
  private readonly webhookSecret?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('stripe.secretKey');
    if (secret) {
      this.stripe = new Stripe(secret, { apiVersion: stripeApiVersion });
    }
    this.webhookSecret =
      this.configService.get<string>('stripe.webhookSecret') ?? undefined;
  }

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        listing: { select: { hostId: true, title: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== userId) {
      throw new ForbiddenException();
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ForbiddenException('Booking is not payable');
    }

    const amount = Math.round(Number(booking.totalPrice) * 100);
    const currency = booking.currency.toLowerCase();

    if (this.stripe) {
      const intent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        metadata: {
          bookingId: booking.id,
        },
        description: `Booking for ${booking.listing.title}`,
      });

      const record = await this.prisma.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          providerId: intent.id,
          status: PaymentStatus.PENDING,
          amount: booking.totalPrice,
          currency: booking.currency,
        },
        create: {
          bookingId: booking.id,
          providerId: intent.id,
          status: PaymentStatus.PENDING,
          amount: booking.totalPrice,
          currency: booking.currency,
          method: 'card',
        },
      });

      return {
        clientSecret: intent.client_secret,
        payment: record,
      };
    }

    const record = await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: PaymentStatus.AUTHORIZED,
        amount: booking.totalPrice,
        currency: booking.currency,
      },
      create: {
        bookingId: booking.id,
        providerId: `offline-${Date.now()}`,
        status: PaymentStatus.AUTHORIZED,
        amount: booking.totalPrice,
        currency: booking.currency,
        method: 'manual',
      },
    });

    return {
      clientSecret: null,
      payment: record,
      message: 'Stripe не настроен. Платёж записан как ручной.',
    };
  }

  async confirmPayment(bookingId: string, hostId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.listing.hostId !== hostId) {
      throw new ForbiddenException();
    }

    if (!booking.payment) {
      throw new NotFoundException('Payment not found');
    }

    if (this.stripe) {
      await this.stripe.paymentIntents.capture(booking.payment.providerId);
    }

    return this.prisma.payment.update({
      where: { bookingId },
      data: {
        status: PaymentStatus.PAID,
        capturedAt: new Date(),
      },
    });
  }

  async getPaymentStatus(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== userId && booking.listing.hostId !== userId) {
      throw new ForbiddenException();
    }

    return booking.payment ?? null;
  }

  async refundPayment(bookingId: string, hostId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.listing.hostId !== hostId) {
      throw new ForbiddenException();
    }

    if (!booking.payment) {
      throw new NotFoundException('Payment not found');
    }

    if (this.stripe) {
      await this.stripe.refunds.create({
        payment_intent: booking.payment.providerId,
      });
    }

    return this.prisma.payment.update({
      where: { bookingId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });
  }

  async handleWebhook(signature: string | undefined, rawBody: Buffer) {
    if (!this.stripe || !this.webhookSecret) {
      return;
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const { object } = event.data;
        if (!this.isPaymentIntent(object)) {
          throw new BadRequestException('Unexpected payment_intent payload');
        }
        await this.handlePaymentSucceeded(object);
        break;
      }
      case 'payment_intent.payment_failed': {
        const { object } = event.data;
        if (!this.isPaymentIntent(object)) {
          throw new BadRequestException('Unexpected payment_intent payload');
        }
        await this.handlePaymentFailed(object);
        break;
      }
      default:
        break;
    }
  }

  private isPaymentIntent(
    payload: Stripe.Event.Data.Object,
  ): payload is Stripe.PaymentIntent {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'object' in payload &&
      (payload as { object?: string }).object === 'payment_intent'
    );
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      return;
    }

    const amountCents = intent.amount_received ?? intent.amount ?? 0;
    const amountDecimal = new Prisma.Decimal(amountCents).div(100);
    const receiptUrl = this.extractReceiptUrl(intent);

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: {
        status: PaymentStatus.PAID,
        amount: amountDecimal,
        currency: intent.currency?.toUpperCase() ?? 'USD',
        receiptUrl,
        capturedAt: new Date(),
      },
      create: {
        bookingId,
        providerId: intent.id,
        status: PaymentStatus.PAID,
        amount: amountDecimal,
        currency: intent.currency?.toUpperCase() ?? 'USD',
        method: intent.payment_method_types?.[0] ?? 'card',
        capturedAt: new Date(),
      },
    });
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const bookingId = intent.metadata?.bookingId;
    if (!bookingId) {
      return;
    }

    await this.prisma.payment.updateMany({
      where: { bookingId },
      data: {
        status: PaymentStatus.FAILED,
      },
    });
  }

  private extractReceiptUrl(intent: Stripe.PaymentIntent): string | undefined {
    const chargesContainer = (
      intent as Stripe.PaymentIntent & {
        charges?: Stripe.ApiList<Stripe.Charge>;
      }
    ).charges;

    if (!chargesContainer || !Array.isArray(chargesContainer.data)) {
      return undefined;
    }

    const [firstCharge] = chargesContainer.data;
    const url = firstCharge?.receipt_url;
    return typeof url === 'string' ? url : undefined;
  }

  async getHostEarnings(
    hostId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ) {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'month':
      default:
        start.setMonth(start.getMonth() - 1);
        break;
    }

    const earnings = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        status: PaymentStatus.PAID,
        booking: {
          listing: { hostId },
          checkOut: { gte: start },
        },
      },
    });

    return {
      totalAmount: Number(earnings._sum.amount ?? 0),
      totalBookings: earnings._count.id,
      period,
    };
  }

  async exportTransactionsCsv(
    hostId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<string> {
    const now = new Date();
    const start = new Date(now);
    if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    else start.setMonth(start.getMonth() - 1);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        booking: { listing: { hostId }, checkOut: { gte: start } },
      },
      include: {
        booking: {
          include: {
            listing: { select: { title: true } },
            guest: { select: { email: true } },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
    });

    const header =
      'id,date,listing,guest_email,amount,currency,method,receipt_url';
    const rows = payments.map((p) => {
      const date = (p.capturedAt ?? p.createdAt).toISOString();
      const title = (p.booking.listing.title ?? '').replace(/"/g, '""');
      return [
        p.id,
        date,
        `"${title}"`,
        p.booking.guest.email,
        Number(p.amount).toFixed(2),
        p.currency,
        p.method,
        p.receiptUrl ?? '',
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async markPayment(hostId: string, bookingId: string, dto: MarkPaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true } },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.listing.hostId !== hostId) {
      throw new ForbiddenException();
    }

    const record = await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: dto.status,
        receiptUrl: dto.receiptUrl,
      },
      create: {
        bookingId: booking.id,
        providerId: booking.payment?.providerId ?? `manual-${Date.now()}`,
        status: dto.status,
        amount: booking.totalPrice,
        currency: booking.currency,
        method: 'manual',
        receiptUrl: dto.receiptUrl,
      },
    });

    return record;
  }

  // ── Stripe Connect (host onboarding & payouts) ───────────────────────────────

  /**
   * Create a Stripe Connect onboarding link for a host.
   * Host visits this URL to connect their bank account.
   */
  async createConnectOnboardingLink(
    hostId: string,
  ): Promise<{ url: string }> {
    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { email: true, stripeConnectId: true },
    });
    if (!host) throw new NotFoundException('User not found');

    if (!this.stripe) {
      return { url: '#stripe-not-configured' };
    }

    let accountId = host.stripeConnectId;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: host.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { hostId },
      });
      accountId = account.id;
      await this.prisma.user.update({
        where: { id: hostId },
        data: { stripeConnectId: accountId },
      });
    }

    const frontendUrl =
      this.configService.get<string>('frontend.url') ?? 'http://localhost:3000';

    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/host/payouts?refresh=true`,
      return_url: `${frontendUrl}/host/payouts?connected=true`,
      type: 'account_onboarding',
    });

    return { url: link.url };
  }

  /** Get the Connect account status for a host */
  async getConnectStatus(
    hostId: string,
  ): Promise<{ connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean }> {
    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { stripeConnectId: true },
    });
    if (!host) throw new NotFoundException('User not found');

    if (!this.stripe || !host.stripeConnectId) {
      return { connected: false, chargesEnabled: false, detailsSubmitted: false };
    }

    const account = await this.stripe.accounts.retrieve(host.stripeConnectId);
    return {
      connected: true,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }
}
