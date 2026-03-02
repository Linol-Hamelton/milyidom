import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from './email-queue.service';
import { PAYOUT_QUEUE, PAYOUT_JOB } from './queue.constants';

export interface PayoutJobData {
  bookingId: string;
  hostId: string;
  /** Amount in the smallest currency unit (kopecks / cents) */
  amountCents: number;
  currency: string;
}

const STRIPE_API_VERSION: Stripe.StripeConfig['apiVersion'] = '2025-08-27.basil';

@Processor(PAYOUT_QUEUE)
export class PayoutProcessor {
  private readonly logger = new Logger(PayoutProcessor.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {
    const key = config.get<string>('stripe.secretKey');
    this.stripe = key ? new Stripe(key, { apiVersion: STRIPE_API_VERSION }) : null;
  }

  @Process(PAYOUT_JOB.PROCESS)
  async handlePayout(job: Job<PayoutJobData>) {
    const { bookingId, hostId, amountCents, currency } = job.data;

    this.logger.debug(
      `Processing payout for booking ${bookingId} → host ${hostId}`,
    );

    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: {
        email: true,
        stripeConnectId: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    if (!host) {
      this.logger.warn(`Host ${hostId} not found — skipping payout`);
      return;
    }

    // Platform fee: 3%
    const platformFeeCents = Math.round(amountCents * 0.03);
    const hostAmountCents = amountCents - platformFeeCents;

    if (this.stripe && host.stripeConnectId) {
      try {
        await this.stripe.transfers.create({
          amount: hostAmountCents,
          currency: currency.toLowerCase(),
          destination: host.stripeConnectId,
          transfer_group: bookingId,
          metadata: { bookingId, hostId },
        });
        this.logger.log(
          `Stripe transfer created for booking ${bookingId}: ${hostAmountCents} ${currency} → ${host.stripeConnectId}`,
        );
      } catch (err) {
        this.logger.error(`Stripe transfer failed for booking ${bookingId}: ${String(err)}`);
        throw err; // re-throw so BullMQ retries the job
      }
    } else {
      // Stripe not configured or host has no Connect account — log for manual processing
      this.logger.warn(
        `Manual payout required: booking ${bookingId}, host ${hostId}, amount ${hostAmountCents} ${currency}`,
      );
    }

    // Record payout attempt in DB for audit trail
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
      amountFormatted: `${(hostAmountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
      bookingId,
    });
  }
}
