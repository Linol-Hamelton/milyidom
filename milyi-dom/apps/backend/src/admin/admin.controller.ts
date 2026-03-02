import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';
import { GetAdminListingsDto } from './dto/get-admin-listings.dto';
import { GetAuditLogDto } from './dto/get-audit-log.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { ModerateListingDto } from './dto/moderate-listing.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query() dto: GetAdminUsersDto) {
    return this.adminService.getUsers(dto);
  }

  @Patch('users/:id/role')
  @HttpCode(200)
  changeUserRole(
    @CurrentUser() admin: CurrentUserType,
    @Param('id') targetId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.adminService.changeUserRole(
      admin.id,
      admin.email,
      targetId,
      dto.role,
    );
  }

  @Patch('users/:id/block')
  @HttpCode(200)
  blockUser(
    @CurrentUser() admin: CurrentUserType,
    @Param('id') targetId: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.adminService.blockUser(
      admin.id,
      admin.email,
      targetId,
      dto.blocked,
    );
  }

  @Get('listings')
  getListings(@Query() dto: GetAdminListingsDto) {
    return this.adminService.getListings(dto);
  }

  @Patch('listings/:id/status')
  @HttpCode(200)
  moderateListing(
    @CurrentUser() admin: CurrentUserType,
    @Param('id') listingId: string,
    @Body() dto: ModerateListingDto,
  ) {
    return this.adminService.moderateListing(
      admin.id,
      admin.email,
      listingId,
      dto.status,
    );
  }

  @Get('audit-log')
  getAuditLog(@Query() dto: GetAuditLogDto) {
    return this.adminService.getAuditLog(dto);
  }

  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('disputes')
  getDisputes() {
    // Placeholder — disputes system planned for future sprint
    return { items: [], meta: { page: 1, limit: 20, total: 0 } };
  }
}
