import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { AuditAction, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Audit, AuditInterceptor } from '../audit/audit.interceptor';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('bookings')
@UseInterceptors(AuditInterceptor)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // 10 booking attempts per minute — prevents booking spam/abuse
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  @Audit(AuditAction.BOOKING_CREATE, 'booking')
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

  @Roles(Role.HOST, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('host')
  hostBookings(
    @CurrentUser() user: CurrentUserType,
    @Query() query: Record<string, unknown>,
  ) {
    const pagination = plainToInstance(PaginationDto, query);
    return this.bookingsService.hostBookings(user.id, pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  @Audit(AuditAction.BOOKING_CANCEL, 'booking')
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.bookingsService.cancelByGuest(id, user.id);
  }

  @Audit(AuditAction.BOOKING_STATUS_CHANGE, 'booking')
  @Roles(Role.HOST, Role.ADMIN)
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
