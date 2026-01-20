import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserType,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.id, createReviewDto);
  }

  @Get('featured')
  findFeatured(@Query('limit') limit?: number) {
    return this.reviewsService.findFeaturedReviews(limit);
  }

  @Get('listing/:listingId')
  findByListing(
    @Param('listingId') listingId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findByListing(listingId, page, limit);
  }

  @Get('listing/:listingId/stats')
  getReviewStats(@Param('listingId') listingId: string) {
    return this.reviewsService.getReviewStats(listingId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findUserReviews(@CurrentUser() user: CurrentUserType) {
    return this.reviewsService.findUserReviews(user.id);
  }

  @Get('host/me')
  @UseGuards(JwtAuthGuard)
  findHostReviews(@CurrentUser() user: CurrentUserType) {
    return this.reviewsService.findHostReviews(user.id);
  }

  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard)
  toggleFeatured(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body('isFeatured') isFeatured: boolean,
  ) {
    return this.reviewsService.toggleFeatured(id, user.id, isFeatured);
  }
}
