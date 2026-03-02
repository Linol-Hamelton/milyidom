import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { NOTIFICATION_QUEUE, NOTIFICATION_JOB } from './queue.constants';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  /** Schedule a booking reminder N days before check-in */
  async scheduleBookingReminder(opts: {
    userId: string;
    bookingId: string;
    listingTitle: string;
    checkIn: Date;
    daysUntilCheckIn: number;
  }): Promise<void> {
    const delay = (opts.daysUntilCheckIn > 0)
      ? opts.checkIn.getTime() - Date.now() - opts.daysUntilCheckIn * 86_400_000
      : 0;

    if (delay < 0) return; // already past

    await this.notificationQueue.add(
      NOTIFICATION_JOB.BOOKING_REMINDER,
      {
        userId: opts.userId,
        bookingId: opts.bookingId,
        listingTitle: opts.listingTitle,
        checkIn: opts.checkIn.toISOString(),
        daysUntilCheckIn: opts.daysUntilCheckIn,
      },
      {
        delay,
        jobId: `reminder-${opts.bookingId}-${opts.daysUntilCheckIn}d`,
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
      },
    );

    this.logger.debug(
      `Scheduled ${opts.daysUntilCheckIn}-day reminder for booking ${opts.bookingId}`,
    );
  }

  /** Enqueue old notification cleanup (runs periodically) */
  async enqueueCleanup(olderThanDays = 30): Promise<void> {
    await this.notificationQueue.add(
      NOTIFICATION_JOB.CLEANUP_OLD,
      { olderThanDays },
      { attempts: 1 },
    );
  }
}
