import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { BookingsModule } from './bookings/bookings.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { QueueModule } from './queue/queue.module';
import { GatewayModule } from './gateway/gateway.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiSearchModule } from './ai-search/ai-search.module';
import { IcalModule } from './ical/ical.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AdminModule } from './admin/admin.module';
import { CacheModule } from './cache/cache.module';
import { StorageModule } from './storage/storage.module';
import { SuperhostModule } from './superhost/superhost.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import configuration from './config/configuration';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Rate limiting: 100 requests per 60 seconds per IP (global default)
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    BookingsModule,
    FavoritesModule,
    ReviewsModule,
    MessagesModule,
    NotificationsModule,
    PaymentsModule,
    EmailModule,
    AuditModule,
    QueueModule,
    GatewayModule,
    SearchModule,
    AnalyticsModule,
    AiSearchModule,
    IcalModule,
    MetricsModule,
    LoyaltyModule,
    AdminModule,
    CacheModule,
    StorageModule,
    SuperhostModule,
    SavedSearchesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Sentry global exception filter
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    // Apply ThrottlerGuard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
