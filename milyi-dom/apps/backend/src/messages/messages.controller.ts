import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // 50 messages per minute — prevents spam
  @Throttle({ global: { ttl: 60_000, limit: 50 } })
  @Post()
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @CurrentUser() user: CurrentUserType,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(user.id, sendMessageDto);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  getConversations(
    @CurrentUser() user: CurrentUserType,
    @Query() query: Record<string, unknown>,
  ) {
    const pagination = plainToInstance(PaginationDto, query);
    return this.messagesService.getConversations(user.id, pagination);
  }

  @Get('conversations/:conversationId')
  @UseGuards(JwtAuthGuard)
  getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.messagesService.getMessages(conversationId, user.id);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser() user: CurrentUserType) {
    return this.messagesService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.messagesService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@CurrentUser() user: CurrentUserType) {
    return this.messagesService.markAllAsRead(user.id);
  }
}
