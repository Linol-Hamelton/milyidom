import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';
import { AiSearchService } from '../ai-search/ai-search.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly aiSearchService: AiSearchService,
  ) {}

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

  /** GET /reviews/listing/:listingId/summary — AI-generated review summary */
  @Get('listing/:listingId/summary')
  async getReviewSummary(@Param('listingId') listingId: string) {
    const result = await this.reviewsService.findByListing(listingId, 1, 50);
    const reviews = (result as { items?: { rating: number; comment: string }[] }).items ?? [];
    const summary = await this.aiSearchService.generateReviewSummary(
      reviews.map((r) => ({ rating: r.rating, comment: r.comment })),
    );
    return { summary, reviewCount: reviews.length };
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

  // ── Host reply ─────────────────────────────────────────────────────────────

  @Patch(':id/reply')
  @UseGuards(JwtAuthGuard)
  replyToReview(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body('reply') reply: string,
  ) {
    return this.reviewsService.replyToReview(id, user.id, reply);
  }

  @Delete(':id/reply')
  @UseGuards(JwtAuthGuard)
  deleteReply(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.reviewsService.deleteReplyToReview(id, user.id);
  }

  // ── Admin moderation ────────────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminFindAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.adminFindAll(Number(page) || 1, Number(limit) || 20);
  }

  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminHide(@Param('id') id: string) {
    return this.reviewsService.adminHideReview(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminDelete(@Param('id') id: string) {
    return this.reviewsService.adminDeleteReview(id);
  }
}
