import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationTemplate = { title: string; body: string };

const DEFAULT_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  BOOKING_CONFIRMATION: {
    title: 'Бронирование подтверждено',
    body: 'Ваше бронирование успешно подтверждено.',
  },
  BOOKING_REMINDER: {
    title: 'Напоминание о заезде',
    body: 'Ваша поездка начинается уже завтра. Мы ждем вас!',
  },
  MESSAGE: {
    title: 'Новое сообщение',
    body: 'У вас новое сообщение в переписке.',
  },
  NEW_REVIEW: {
    title: 'Получен новый отзыв',
    body: 'Гость оставил отзыв о вашем жилье.',
  },
  SYSTEM: {
    title: 'Системное уведомление',
    body: 'У вас новое уведомление.',
  },
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
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

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });

    return { count };
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: unknown;
  }) {
    const normalizedData = this.normalizeJson(data.data);

    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: normalizedData,
      },
    });
  }

  private normalizeJson(
    value: unknown,
  ): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (value === null) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const normalizedArray = value
        .map((item) => this.normalizeJson(item))
        .filter(
          (item): item is Prisma.InputJsonValue => item !== undefined,
        );
      return normalizedArray as Prisma.JsonArray;
    }

    if (typeof value === 'object') {
      const result: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, entry] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const normalized = this.normalizeJson(entry);
        if (normalized !== undefined) {
          result[key] = normalized;
        }
      }
      return result as Prisma.JsonObject;
    }

    return undefined;
  }

  async createBookingNotification(bookingId: string, type: NotificationType) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: true,
        guest: true,
      },
    });

    if (!booking) {
      return;
    }

    const templates: Record<NotificationType, NotificationTemplate> = {
      ...DEFAULT_TEMPLATES,
      BOOKING_CONFIRMATION: {
        title: 'Бронирование подтверждено',
        body: `Ваше бронирование «${booking.listing.title}» успешно подтверждено.`,
      },
      BOOKING_REMINDER: {
        title: 'Напоминание о заезде',
        body: `Заселение в «${booking.listing.title}» начинается через 24 часа.`,
      },
      NEW_REVIEW: {
        title: 'Получен новый отзыв',
        body: `Гость оставил отзыв о жилье «${booking.listing.title}».`,
      },
    };

    const template = templates[type] ?? DEFAULT_TEMPLATES.SYSTEM;

    await this.create({
      userId: booking.guestId,
      type,
      title: template.title,
      body: template.body,
      data: { bookingId },
    });

    if (type === 'BOOKING_CONFIRMATION' || type === 'NEW_REVIEW') {
      await this.create({
        userId: booking.listing.hostId,
        type,
        title: template.title,
        body: template.body,
        data: { bookingId },
      });
    }
  }

  async createMessageNotification(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        conversation: true,
      },
    });

    if (!message) {
      return;
    }

    await this.create({
      userId: message.recipientId,
      type: 'MESSAGE',
      title: DEFAULT_TEMPLATES.MESSAGE.title,
      body: DEFAULT_TEMPLATES.MESSAGE.body,
      data: { messageId, conversationId: message.conversationId },
    });
  }

  async cleanupOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}
