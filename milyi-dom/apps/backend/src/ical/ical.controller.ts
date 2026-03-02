import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsArray, IsString, IsUrl } from 'class-validator';
import { IcalService } from './ical.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

class SyncUrlDto {
  @IsUrl()
  url!: string;
}

class BlockDatesDto {
  @IsArray()
  @IsString({ each: true })
  dates!: string[];
}

@Controller('ical')
export class IcalController {
  constructor(private readonly icalService: IcalService) {}

  /** Public: get iCal feed for a listing by token (no auth needed for calendar apps) */
  @Get('feed/:token')
  async getFeed(@Param('token') token: string, @Res() res: Response) {
    const cal = await this.icalService.generateFeed(token);
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
      'Cache-Control': 'no-store',
    });
    res.send(cal.toString());
  }

  /** Public: get blocked/booked dates for a listing (for booking widget calendar) */
  @Get('blocked/:listingId')
  getBlockedDates(@Param('listingId') listingId: string) {
    return this.icalService.getBlockedDates(listingId);
  }

  /** Host: get blocked dates with source info (manual vs ical_sync) for host calendar UI */
  @Get('blocked/:listingId/detailed')
  @UseGuards(JwtAuthGuard)
  getBlockedDatesDetailed(
    @Param('listingId') listingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.getBlockedDatesDetailed(listingId, user.id);
  }

  /** Host: get their iCal sync URLs */
  @Get('sync/:listingId')
  @UseGuards(JwtAuthGuard)
  getSyncUrls(
    @Param('listingId') listingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.getSyncUrls(listingId, user.id);
  }

  /** Host: add an external iCal URL and trigger first sync */
  @Post('sync/:listingId')
  @UseGuards(JwtAuthGuard)
  syncExternal(
    @Param('listingId') listingId: string,
    @Body() dto: SyncUrlDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.syncExternalCalendar(listingId, user.id, dto.url);
  }

  /** Host: remove an iCal sync URL */
  @Delete('sync/:listingId')
  @UseGuards(JwtAuthGuard)
  removeSyncUrl(
    @Param('listingId') listingId: string,
    @Body() dto: SyncUrlDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.removeSyncUrl(listingId, user.id, dto.url);
  }

  /** Host: manually block dates */
  @Post('block/:listingId')
  @UseGuards(JwtAuthGuard)
  blockDates(
    @Param('listingId') listingId: string,
    @Body() dto: BlockDatesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.blockDates(listingId, user.id, dto.dates);
  }

  /** Host: unblock dates */
  @Delete('block/:listingId')
  @UseGuards(JwtAuthGuard)
  unblockDates(
    @Param('listingId') listingId: string,
    @Body() dto: BlockDatesDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.icalService.unblockDates(listingId, user.id, dto.dates);
  }
}
