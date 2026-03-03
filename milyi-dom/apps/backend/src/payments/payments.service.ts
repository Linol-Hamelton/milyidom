import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { MarkPaymentDto } from './dto/mark-payment.dto';
import { YooKassaClient, type YooKassaPayment } from './yookassa.client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly yookassa?: YooKassaClient;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const shopId = this.configService.get<string>('yookassa.shopId');
    const secretKey = this.configService.get<string>('yookassa.secretKey');
    const payoutToken = this.configService.get<string>('yookassa.payoutToken') ?? '';

    if (shopId && secretKey) {
      this.yookassa = new YooKassaClient(shopId, secretKey, payoutToken);
    }

    this.frontendUrl =
      this.configService.get<string>('frontend.url') ?? 'https://milyidom.com';
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

    const amountRub = Number(booking.totalPrice);
    const returnUrl = `${this.frontendUrl}/bookings/${booking.id}?payment=success`;
    const description = `Бронирование: ${booking.listing.title}`;

    if (this.yookassa) {
      const { id: providerId, confirmationUrl } =
        await this.yookassa.createPayment(amountRub, booking.id, description, returnUrl);

      const record = await this.prisma.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          providerId,
          status: PaymentStatus.PENDING,
          amount: booking.totalPrice,
          currency: booking.currency,
        },
        create: {
          bookingId: booking.id,
          providerId,
          status: PaymentStatus.PENDING,
          amount: booking.totalPrice,
          currency: booking.currency,
          method: 'yookassa',
        },
      });

      return { confirmationUrl, clientSecret: null, payment: record };
    }

    // YooKassa not configured — store offline payment for manual processing
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
      confirmationUrl: null,
      clientSecret: null,
      payment: record,
      message: 'YooKassa не настроена. Платёж записан как ручной.',
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

    if (this.yookassa) {
      const amountRub = Number(booking.payment.amount);
      await this.yookassa.refundPayment(booking.payment.providerId, amountRub);
    }

    return this.prisma.payment.update({
      where: { bookingId },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  // ── YooKassa Webhook ──────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer) {
    // YooKassa sends JSON — parse event object
    let event: { type: string; object: YooKassaPayment };
    try {
      event = JSON.parse(rawBody.toString()) as {
        type: string;
        object: YooKassaPayment;
      };
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const { type, object } = event;

    switch (type) {
      case 'payment.succeeded':
        await this.handlePaymentSucceeded(object);
        break;
      case 'payment.canceled':
        await this.handlePaymentFailed(object);
        break;
      default:
        this.logger.debug(`Unhandled YooKassa event: ${type}`);
        break;
    }
  }

  private async handlePaymentSucceeded(payment: YooKassaPayment) {
    const bookingId = payment.metadata?.bookingId;
    if (!bookingId) return;

    const amountDecimal = new Prisma.Decimal(payment.amount.value);

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: {
        status: PaymentStatus.PAID,
        amount: amountDecimal,
        currency: payment.amount.currency,
        capturedAt: new Date(),
      },
      create: {
        bookingId,
        providerId: payment.id,
        status: PaymentStatus.PAID,
        amount: amountDecimal,
        currency: payment.amount.currency,
        method: 'yookassa',
        capturedAt: new Date(),
      },
    });
  }

  private async handlePaymentFailed(payment: YooKassaPayment) {
    const bookingId = payment.metadata?.bookingId;
    if (!bookingId) return;

    await this.prisma.payment.updateMany({
      where: { bookingId },
      data: { status: PaymentStatus.FAILED },
    });
  }

  // ── Host Payout Phone (YooKassa SBP) ─────────────────────────────────────

  async savePayoutPhone(hostId: string, phone: string): Promise<{ phone: string }> {
    const normalized = phone.replace(/\s+/g, '').replace(/^8/, '+7');
    if (!/^\+7\d{10}$/.test(normalized)) {
      throw new BadRequestException('Неверный формат телефона. Используйте +7XXXXXXXXXX');
    }
    await this.prisma.user.update({
      where: { id: hostId },
      data: { payoutPhone: normalized },
    });
    return { phone: normalized };
  }

  async getPayoutStatus(hostId: string): Promise<{ hasPayoutMethod: boolean; phone: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { payoutPhone: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      hasPayoutMethod: !!user.payoutPhone,
      phone: user.payoutPhone,
    };
  }

  // ── Host Earnings ─────────────────────────────────────────────────────────

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
}
