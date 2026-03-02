import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('host')
  @Roles(Role.HOST, Role.ADMIN)
  getHostAnalytics(@CurrentUser() user: CurrentUserType) {
    return this.analyticsService.getHostAnalytics(user.id);
  }

  /** Platform-wide admin metrics: GMV, DAU, conversion, top cities */
  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminAnalytics() {
    return this.analyticsService.getAdminAnalytics();
  }
}
