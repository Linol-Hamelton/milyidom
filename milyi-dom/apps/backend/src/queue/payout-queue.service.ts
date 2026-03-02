import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PAYOUT_QUEUE, PAYOUT_JOB } from './queue.constants';
import type { PayoutJobData } from './payout.processor';

@Injectable()
export class PayoutQueueService {
  private readonly logger = new Logger(PayoutQueueService.name);

  constructor(
    @InjectQueue(PAYOUT_QUEUE) private readonly payoutQueue: Queue,
  ) {}

  /**
   * Schedule a host payout D+1 after check-in.
   * BullMQ delay ensures money isn't released until guest has checked in.
   */
  async schedulePostCheckInPayout(opts: {
    bookingId: string;
    hostId: string;
    amountCents: number;
    currency: string;
    checkIn: Date;
  }): Promise<void> {
    // Release funds 24 hours after check-in
    const releaseAt = new Date(opts.checkIn.getTime() + 24 * 60 * 60 * 1000);
    const delay = Math.max(0, releaseAt.getTime() - Date.now());

    const jobData: PayoutJobData = {
      bookingId: opts.bookingId,
      hostId: opts.hostId,
      amountCents: opts.amountCents,
      currency: opts.currency,
    };

    await this.payoutQueue.add(PAYOUT_JOB.PROCESS, jobData, {
      delay,
      jobId: `payout-${opts.bookingId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 },
    });

    this.logger.log(
      `Payout scheduled for booking ${opts.bookingId} in ${Math.round(delay / 3600000)}h`,
    );
  }

  /** Trigger an immediate payout (admin/manual override) */
  async triggerImmediatePayout(opts: Omit<PayoutJobData, never>): Promise<void> {
    await this.payoutQueue.add(PAYOUT_JOB.PROCESS, opts, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 },
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.payoutQueue.getWaitingCount(),
      this.payoutQueue.getActiveCount(),
      this.payoutQueue.getCompletedCount(),
      this.payoutQueue.getFailedCount(),
      this.payoutQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }
}
