import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { AiSearchModule } from '../ai-search/ai-search.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AiSearchModule, UsersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
