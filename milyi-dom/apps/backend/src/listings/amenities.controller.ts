import { Controller, Get, Param } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Get()
  findAll() {
    return this.amenitiesService.findAll();
  }

  @Get('categories')
  findCategories() {
    return this.amenitiesService.findCategories();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.amenitiesService.findByCategory(category);
  }

  @Get('with-counts')
  getWithCounts() {
    return this.amenitiesService.getAmenitiesWithCounts();
  }
}
