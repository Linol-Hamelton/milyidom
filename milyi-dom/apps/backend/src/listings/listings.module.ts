import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { AmenitiesService } from './amenities.service';
import { AmenitiesController } from './amenities.controller';
import { SearchModule } from '../search/search.module';
import { AiSearchModule } from '../ai-search/ai-search.module';

@Module({
  imports: [SearchModule, AiSearchModule],
  controllers: [ListingsController, AmenitiesController],
  providers: [ListingsService, AmenitiesService],
  exports: [ListingsService],
})
export class ListingsModule {}
