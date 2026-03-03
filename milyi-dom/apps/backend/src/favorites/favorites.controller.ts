import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: CurrentUserType) {
    return this.favoritesService.findAll(user.id);
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  async getCount(@CurrentUser() user: CurrentUserType) {
    const count = await this.favoritesService.getFavoritesCount(user.id);
    return { count };
  }

  @Get(':listingId/check')
  @UseGuards(OptionalJwtAuthGuard)
  checkFavorite(
    @Param('listingId') listingId: string,
    @CurrentUser() user: CurrentUserType | null,
  ) {
    if (!user) return { isFavorite: false };
    return this.favoritesService.isInFavorites(user.id, listingId);
  }

  @Post(':listingId')
  @UseGuards(JwtAuthGuard)
  addToFavorites(
    @Param('listingId') listingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.favoritesService.addToFavorites(user.id, listingId);
  }

  @Delete(':listingId')
  @UseGuards(JwtAuthGuard)
  removeFromFavorites(
    @Param('listingId') listingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.favoritesService.removeFromFavorites(user.id, listingId);
  }
}
