import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  searchListings(
    @Query('q') q = '',
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('minPrice') minPriceRaw?: string,
    @Query('maxPrice') maxPriceRaw?: string,
    @Query('maxGuests') maxGuestsRaw?: string,
    @Query('bedroomsCount') bedroomsCountRaw?: string,
    @Query('amenities') amenitiesRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('perPage') perPageRaw?: string,
    @Query('sortBy') sortBy: 'rating' | 'pricePerNight' | 'reviewsCount' = 'rating',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.searchService.searchListings({
      q,
      city,
      country,
      minPrice: minPriceRaw !== undefined ? parseFloat(minPriceRaw) : undefined,
      maxPrice: maxPriceRaw !== undefined ? parseFloat(maxPriceRaw) : undefined,
      maxGuests: maxGuestsRaw !== undefined ? parseInt(maxGuestsRaw, 10) : undefined,
      bedroomsCount: bedroomsCountRaw !== undefined ? parseInt(bedroomsCountRaw, 10) : undefined,
      amenities: amenitiesRaw ? amenitiesRaw.split(',').map((a) => a.trim()) : undefined,
      page: pageRaw !== undefined ? parseInt(pageRaw, 10) : 1,
      perPage: perPageRaw !== undefined ? parseInt(perPageRaw, 10) : 20,
      sortBy,
      sortOrder,
    });
  }
}
