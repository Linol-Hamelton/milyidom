import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, DisputeStatus } from '@prisma/client';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateDisputeDto) {
    return this.service.create(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: CurrentUserType) {
    return this.service.findMyDisputes(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: DisputeStatus,
  ) {
    return this.service.findAll(Number(page), Number(limit), status);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.service.resolve(id, dto);
  }
}
