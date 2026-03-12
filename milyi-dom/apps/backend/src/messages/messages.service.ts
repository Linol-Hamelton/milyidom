import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AppGateway } from '../gateway/app.gateway';
import { WS_EVENT } from '../gateway/gateway.types';

const conversationSummaryInclude = {
  messages: {
    orderBy: { sentAt: Prisma.SortOrder.desc },
    take: 1,
  },
  listing: {
    select: {
      id: true,
      title: true,
      images: {
        orderBy: { position: Prisma.SortOrder.asc },
        take: 1,
      },
    },
  },
  host: {
    select: { id: true, email: true, profile: true },
  },
  guest: {
    select: { id: true, email: true, profile: true },
  },
} satisfies Prisma.ConversationInclude;

const conversationDetailInclude = {
  messages: {
    orderBy: { sentAt: Prisma.SortOrder.asc },
    include: {
      sender: { select: { id: true, email: true, profile: true } },
      recipient: { select: { id: true, email: true, profile: true } },
    },
  },
  listing: {
    select: {
      id: true,
      title: true,
      images: {
        orderBy: { position: Prisma.SortOrder.asc },
        take: 1,
      },
    },
  },
  host: {
    select: { id: true, email: true, profile: true },
  },
  guest: {
    select: { id: true, email: true, profile: true },
  },
} satisfies Prisma.ConversationInclude;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
  ) {}

  async sendMessage(userId: string, dto: SendMessageDto) {
    const { conversation, recipientId } = await this.resolveConversation(
      userId,
      dto,
    );

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        recipientId,
        body: dto.body,
      },
      include: {
        conversation: { include: conversationDetailInclude },
        sender: { select: { id: true, email: true, profile: true } },
        recipient: { select: { id: true, email: true, profile: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    this.gateway.server
      .to(`conversation:${conversation.id}`)
      .emit(WS_EVENT.MESSAGE, message);
    this.gateway.pushNotification(recipientId, {
      type: 'MESSAGE',
      title: 'Новое сообщение',
      body: dto.body.slice(0, 100),
      data: { conversationId: conversation.id },
    });

    return message;
  }

  async getConversations(userId: string, pagination: PaginationDto = new PaginationDto()) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          OR: [{ hostId: userId }, { guestId: userId }],
        },
        orderBy: { updatedAt: Prisma.SortOrder.desc },
        include: conversationSummaryInclude,
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({
        where: {
          OR: [{ hostId: userId }, { guestId: userId }],
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationDetailInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.hostId !== userId && conversation.guestId !== userId) {
      throw new ForbiddenException();
    }

    return conversation;
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });

    return { unread: count };
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.recipientId !== userId) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.message.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      success: result.count > 0,
      updated: result.count,
    };
  }

  private async resolveConversation(userId: string, dto: SendMessageDto) {
    if (dto.conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.hostId !== userId && conversation.guestId !== userId) {
        throw new ForbiddenException();
      }

      const recipientId =
        conversation.hostId === userId
          ? conversation.guestId
          : conversation.hostId;
      return { conversation, recipientId };
    }

    if (!dto.listingId || !dto.recipientId) {
      throw new NotFoundException('Conversation context is missing');
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const hostId = listing.hostId;
    const guestId = userId === hostId ? dto.recipientId : userId;

    if (userId !== hostId && dto.recipientId !== hostId) {
      throw new ForbiddenException(
        'Only listing hosts and guests can start a conversation',
      );
    }

    const conversation =
      (await this.prisma.conversation.findFirst({
        where: {
          hostId,
          guestId,
          listingId: listing.id,
        },
      })) ||
      (await this.prisma.conversation.create({
        data: {
          hostId,
          guestId,
          listingId: listing.id,
        },
      }));

    const recipientId =
      conversation.hostId === userId
        ? conversation.guestId
        : conversation.hostId;
    return { conversation, recipientId };
  }
}
