import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { EMAIL_QUEUE, EMAIL_JOB } from './queue.constants';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.WELCOME,
      { email, firstName },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.PASSWORD_RESET,
      { email, token },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.EMAIL_VERIFY,
      { email, token },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendBookingConfirmation(opts: {
    to: string;
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    currency: string;
    bookingId: string;
  }): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.BOOKING_CONFIRMATION,
      {
        ...opts,
        checkIn: opts.checkIn.toISOString(),
        checkOut: opts.checkOut.toISOString(),
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendBookingRequest(opts: {
    to: string;
    hostName: string;
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    bookingId: string;
  }): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.BOOKING_REQUEST,
      {
        ...opts,
        checkIn: opts.checkIn.toISOString(),
        checkOut: opts.checkOut.toISOString(),
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendBookingCancellation(opts: {
    to: string;
    recipientName: string;
    listingTitle: string;
    checkIn: Date;
    bookingId: string;
  }): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.BOOKING_CANCELLATION,
      {
        ...opts,
        checkIn: opts.checkIn.toISOString(),
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendSuperhostPromotion(email: string, firstName: string): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.SUPERHOST_PROMO,
      { email, firstName },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendPayoutNotification(opts: {
    to: string;
    hostName: string;
    amountFormatted: string;
    bookingId: string;
  }): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.PAYOUT_SENT,
      opts,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async sendSavedSearchAlert(opts: {
    email: string;
    firstName: string;
    searchName: string;
    newCount: number;
    searchUrl: string;
  }): Promise<void> {
    await this.emailQueue.add(
      EMAIL_JOB.SAVED_SEARCH_ALERT,
      opts,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
