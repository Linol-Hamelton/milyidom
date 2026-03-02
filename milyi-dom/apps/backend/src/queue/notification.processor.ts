import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { NotificationsService } from '../notifications/notifications.service';
import { NOTIFICATION_QUEUE, NOTIFICATION_JOB } from './queue.constants';

interface BookingReminderJobData {
  userId: string;
  bookingId: string;
  listingTitle: string;
  checkIn: string; // ISO string
  daysUntilCheckIn: number;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process(NOTIFICATION_JOB.BOOKING_REMINDER)
  async handleBookingReminder(job: Job<BookingReminderJobData>) {
    const { userId, bookingId, listingTitle, daysUntilCheckIn } = job.data;
    this.logger.debug(
      `Sending booking reminder to user ${userId} for booking ${bookingId}`,
    );
    await this.notificationsService.create({
      userId,
      type: 'SYSTEM',
      title: `Напоминание о заезде через ${daysUntilCheckIn} ${daysUntilCheckIn === 1 ? 'день' : 'дня'}`,
      body: `Ваш заезд в "${listingTitle}" ${new Date(job.data.checkIn).toLocaleDateString('ru-RU')}. Не забудьте подтвердить время прибытия.`,
      data: { bookingId },
    });
  }

  @Process(NOTIFICATION_JOB.CLEANUP_OLD)
  async handleCleanupOld(job: Job<{ olderThanDays: number }>) {
    const days = job.data.olderThanDays ?? 30;
    this.logger.debug(`Cleaning notifications older than ${days} days`);
    await this.notificationsService.cleanupOldNotifications(days);
  }
}
