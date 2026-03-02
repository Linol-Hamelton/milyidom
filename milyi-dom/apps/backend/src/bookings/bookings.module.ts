import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { AuditModule } from '../audit/audit.module';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [NotificationsModule, QueueModule, AuditModule, LoyaltyModule],
  controllers: [BookingsController],
  providers: [BookingsService, AuditInterceptor],
})
export class BookingsModule {}
