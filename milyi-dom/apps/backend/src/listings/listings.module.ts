import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { AmenitiesService } from './amenities.service';
import { AmenitiesController } from './amenities.controller';

@Module({
  controllers: [ListingsController, AmenitiesController],
  providers: [ListingsService, AmenitiesService],
  exports: [ListingsService],
})
export class ListingsModule {}
