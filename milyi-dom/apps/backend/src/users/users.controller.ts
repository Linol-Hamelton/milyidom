import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMe(@CurrentUser() user: CurrentUserType) {
    return this.usersService.findMe(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() user: CurrentUserType,
    @Body() updateMeDto: UpdateMeDto,
  ) {
    return this.usersService.updateMe(user.id, updateMeDto);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: CurrentUserType,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  getUserStats(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getUserStats(user.id);
  }

  /** GDPR: export all personal data */
  @Get('me/export')
  @UseGuards(JwtAuthGuard)
  exportMyData(@CurrentUser() user: CurrentUserType) {
    return this.usersService.exportMyData(user.id);
  }

  /** GDPR: anonymize and delete account */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  deleteMe(@CurrentUser() user: CurrentUserType) {
    return this.usersService.deleteMe(user.id);
  }

  @Get('top-hosts')
  getTopHosts(@Query('limit') limit?: number) {
    return this.usersService.getTopHosts(limit);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  verifyUser(@Param('id') id: string) {
    return this.usersService.verifyUser(id);
  }

  @Patch(':id/promote-superhost')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  promoteToSuperhost(@Param('id') id: string) {
    return this.usersService.promoteToSuperhost(id);
  }

  @Get('me/notification-prefs')
  @UseGuards(JwtAuthGuard)
  getNotificationPrefs(@CurrentUser() user: CurrentUserType) {
    return this.usersService.getNotificationPrefs(user.id);
  }

  @Patch('me/notification-prefs')
  @UseGuards(JwtAuthGuard)
  updateNotificationPrefs(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.usersService.updateNotificationPrefs(user.id, dto);
  }

  @Post('me/push-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  registerPushToken(
    @CurrentUser() user: CurrentUserType,
    @Body('token') token: string,
  ) {
    return this.usersService.registerPushToken(user.id, token);
  }

  @Post('me/become-host')
  @UseGuards(JwtAuthGuard)
  becomeHost(@CurrentUser() user: CurrentUserType) {
    return this.usersService.becomeHost(user.id);
  }
}
