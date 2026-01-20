import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  myBookings(
    @CurrentUser() user: CurrentUserType,
    @Query() query: Record<string, unknown>,
  ) {
    const pagination = plainToInstance(PaginationDto, query);
    return this.bookingsService.guestBookings(user.id, pagination);
  }

  @Roles(Role.HOST)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('host')
  hostBookings(
    @CurrentUser() user: CurrentUserType,
    @Query() query: Record<string, unknown>,
  ) {
    const pagination = plainToInstance(PaginationDto, query);
    return this.bookingsService.hostBookings(user.id, pagination);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingsService.cancelByGuest(id, user.id);
  }

  @Roles(Role.HOST)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user.id, dto);
  }
}
