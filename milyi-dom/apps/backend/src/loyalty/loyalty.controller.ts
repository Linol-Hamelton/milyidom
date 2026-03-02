import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

class RedeemDto {
  @IsInt()
  @Min(1)
  points!: number;

  @IsString()
  bookingId!: string;
}

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /** GET /loyalty/me — balance + tier + next-tier info */
  @Get('me')
  getBalance(@CurrentUser() user: CurrentUserType) {
    return this.loyaltyService.getBalance(user.id);
  }

  /** GET /loyalty/history?limit=20 — transaction history */
  @Get('history')
  getHistory(
    @CurrentUser() user: CurrentUserType,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.loyaltyService.getHistory(user.id, limit);
  }

  /** POST /loyalty/redeem — spend points for a booking discount */
  @Post('redeem')
  redeem(@CurrentUser() user: CurrentUserType, @Body() dto: RedeemDto) {
    return this.loyaltyService.redeem(user.id, dto.points, dto.bookingId);
  }
}
