import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email-queue.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationQueueService } from './notification-queue.service';
import { PayoutProcessor } from './payout.processor';
import { PayoutQueueService } from './payout-queue.service';
import { EMAIL_QUEUE, NOTIFICATION_QUEUE, PAYOUT_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('redis.url', 'redis://localhost:6379'),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: EMAIL_QUEUE },
      { name: NOTIFICATION_QUEUE },
      { name: PAYOUT_QUEUE },
    ),
    // Bull Board admin UI at /admin/queues
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: EMAIL_QUEUE, adapter: BullAdapter as never },
      { name: NOTIFICATION_QUEUE, adapter: BullAdapter as never },
      { name: PAYOUT_QUEUE, adapter: BullAdapter as never },
    ),
    EmailModule,
    NotificationsModule,
  ],
  providers: [
    EmailProcessor,
    EmailQueueService,
    NotificationProcessor,
    NotificationQueueService,
    PayoutProcessor,
    PayoutQueueService,
  ],
  exports: [EmailQueueService, NotificationQueueService, PayoutQueueService],
})
export class QueueModule {}
