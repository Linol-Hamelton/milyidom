import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from './email-queue.service';
import { PAYOUT_QUEUE, PAYOUT_JOB } from './queue.constants';
import { YooKassaClient } from '../payments/yookassa.client';

export interface PayoutJobData {
  bookingId: string;
  hostId: string;
  /** Amount in kopecks (smallest unit) */
  amountCents: number;
  currency: string;
}

/** Platform commission rate: 10% */
const PLATFORM_FEE_RATE = 0.10;

@Processor(PAYOUT_QUEUE)
export class PayoutProcessor {
  private readonly logger = new Logger(PayoutProcessor.name);
  private readonly yookassa: YooKassaClient | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {
    const shopId = config.get<string>('yookassa.shopId');
    const secretKey = config.get<string>('yookassa.secretKey');
    const payoutToken = config.get<string>('yookassa.payoutToken') ?? '';
    this.yookassa =
      shopId && secretKey
        ? new YooKassaClient(shopId, secretKey, payoutToken)
        : null;
  }

  @Process(PAYOUT_JOB.PROCESS)
  async handlePayout(job: Job<PayoutJobData>) {
    const { bookingId, hostId, amountCents } = job.data;

    this.logger.debug(
      `Processing payout for booking ${bookingId} → host ${hostId}`,
    );

    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: {
        email: true,
        payoutPhone: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    if (!host) {
      this.logger.warn(`Host ${hostId} not found — skipping payout`);
      return;
    }

    // Platform fee: 10%
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_RATE);
    const hostAmountCents = amountCents - platformFeeCents;
    const hostAmountRub = hostAmountCents / 100;

    if (this.yookassa && host.payoutPhone) {
      try {
        await this.yookassa.createPayout(
          hostAmountRub,
          host.payoutPhone,
          `Выплата за бронирование ${bookingId}`,
        );
        this.logger.log(
          `YooKassa payout created: booking ${bookingId} → ${host.payoutPhone}, ${hostAmountRub} RUB (platform fee: ${platformFeeCents / 100} RUB)`,
        );
      } catch (err) {
        this.logger.error(
          `YooKassa payout failed for booking ${bookingId}: ${String(err)}`,
        );
        throw err; // re-throw so BullMQ retries the job
      }
    } else {
      // No payout method configured — log for manual processing
      this.logger.warn(
        `Manual payout required: booking ${bookingId}, host ${hostId}, amount ${hostAmountRub} RUB (payoutPhone: ${host.payoutPhone ?? 'not set'})`,
      );
    }

    // Record payout timestamp for audit
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { updatedAt: new Date() },
    });

    // Notify host via email
    const hostName = host.profile
      ? `${host.profile.firstName} ${host.profile.lastName}`.trim()
      : host.email;

    void this.emailQueue.sendPayoutNotification({
      to: host.email,
      hostName,
      amountFormatted: `${hostAmountRub.toFixed(2)} RUB`,
      bookingId,
    });
  }
}
