import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSearchService } from './ai-search.service';
import { AiSearchController } from './ai-search.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [ConfigModule, MetricsModule],
  controllers: [AiSearchController],
  providers: [AiSearchService],
  exports: [AiSearchService],
})
export class AiSearchModule {}
