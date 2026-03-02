import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  ListingStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { PayoutQueueService } from '../queue/payout-queue.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const bookingInclude = {
  listing: {
    include: {
      images: {
        orderBy: { position: Prisma.SortOrder.asc },
        take: 1,
      },
      host: {
        select: {
          id: true,
          email: true,
          profile: true,
        },
      },
    },
  },
  guest: {
    select: {
      id: true,
      email: true,
      profile: true,
    },
  },
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailQueueService,
    private readonly payoutQueue: PayoutQueueService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async create(guestId: string, dto: CreateBookingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: {
        id: true,
        title: true,
        hostId: true,
        status: true,
        instantBook: true,
        minNights: true,
        maxNights: true,
        basePrice: true,
        cleaningFee: true,
        serviceFee: true,
        currency: true,
        host: { select: { email: true, profile: { select: { firstName: true } } } },
        bookings: {
          where: {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
          select: { checkIn: true, checkOut: true },
        },
      },
    });

    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException('Объявление недоступно для бронирования');
    }

    // A host cannot book their own listing
    if (listing.hostId === guestId) {
      throw new BadRequestException('Нельзя забронировать собственное объявление');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Дата выезда должна быть позже даты заезда');
    }

    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (listing.minNights && nights < listing.minNights) {
      throw new BadRequestException(
        `Минимальный срок проживания — ${listing.minNights} ${listing.minNights === 1 ? 'ночь' : listing.minNights <= 4 ? 'ночи' : 'ночей'}`,
      );
    }

    if (listing.maxNights && nights > listing.maxNights) {
      throw new BadRequestException(
        `Максимальный срок проживания — ${listing.maxNights} ${listing.maxNights === 1 ? 'ночь' : listing.maxNights <= 4 ? 'ночи' : 'ночей'}`,
      );
    }

    const overlap = listing.bookings.some(
      (booking) => checkIn < booking.checkOut && checkOut > booking.checkIn,
    );

    if (overlap) {
      throw new BadRequestException('Выбранные даты уже заняты');
    }

    const basePrice = Number(listing.basePrice);
    const cleaningFee = listing.cleaningFee ? Number(listing.cleaningFee) : 0;
    const serviceFee = listing.serviceFee ? Number(listing.serviceFee) : 0;
    const totalPrice = basePrice * nights + cleaningFee + serviceFee;

    const booking = await this.prisma.booking.create({
      data: {
        listingId: listing.id,
        guestId,
        checkIn,
        checkOut,
        status: listing.instantBook
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING,
        adults: dto.adults,
        children: dto.children ?? 0,
        infants: dto.infants ?? 0,
        pets: dto.pets ?? 0,
        totalPrice,
        currency: listing.currency,
      },
      include: bookingInclude,
    });

    await this.notifications.create({
      userId: listing.hostId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: listing.instantBook
        ? 'Мгновенное бронирование подтверждено'
        : 'Новый запрос на бронирование',
      body: `${listing.title} — ${nights} ${nights === 1 ? 'ночь' : nights <= 4 ? 'ночи' : 'ночей'}`,
      data: { listingId: listing.id, bookingId: booking.id },
    });

    await this.notifications.create({
      userId: guestId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: listing.instantBook
        ? 'Ваш заезд подтверждён'
        : 'Запрос на бронирование отправлен',
      body: `${listing.title} — ${nights} ${nights === 1 ? 'ночь' : nights <= 4 ? 'ночи' : 'ночей'}`,
      data: { listingId: listing.id, bookingId: booking.id },
    });

    // Send email notifications (fire-and-forget — never block booking creation)
    const guest = await this.prisma.user.findUnique({
      where: { id: guestId },
      select: { email: true, profile: { select: { firstName: true } } },
    });

    // Schedule payout for instant-book (auto-confirmed) bookings
    if (listing.instantBook) {
      void this.payoutQueue.schedulePostCheckInPayout({
        bookingId: booking.id,
        hostId: listing.hostId,
        amountCents: Math.round(totalPrice * 100),
        currency: listing.currency,
        checkIn,
      });
    }

    if (listing.instantBook && guest) {
      // Confirmed booking: notify the guest
      void this.emailService.sendBookingConfirmation({
        to: guest.email,
        guestName: guest.profile?.firstName ?? 'Гость',
        listingTitle: listing.title,
        checkIn,
        checkOut,
        totalPrice,
        currency: listing.currency,
        bookingId: booking.id,
      });
    } else if (listing.host && guest) {
      // Pending booking: notify the host
      void this.emailService.sendBookingRequest({
        to: listing.host.email,
        hostName: listing.host.profile?.firstName ?? 'Хост',
        guestName: guest.profile?.firstName ?? 'Гость',
        listingTitle: listing.title,
        checkIn,
        checkOut,
        bookingId: booking.id,
      });
    }

    return booking;
  }

  async updateStatus(
    bookingId: string,
    hostId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          select: { hostId: true, title: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.listing.hostId !== hostId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: dto.status },
      include: bookingInclude,
    });

    await this.notifications.create({
      userId: updated.guestId,
      type: NotificationType.SYSTEM,
      title:
        dto.status === BookingStatus.CONFIRMED
          ? 'Хозяин подтвердил ваш заезд'
          : dto.status === BookingStatus.CANCELLED
          ? 'Бронирование отменено'
          : dto.status === BookingStatus.COMPLETED
          ? 'Поездка завершена'
          : 'Статус бронирования изменён',
      body: booking.listing.title,
      data: { bookingId: updated.id, status: dto.status },
    });

    // Schedule payout D+1 after check-in when host confirms
    if (dto.status === BookingStatus.CONFIRMED) {
      void this.payoutQueue.schedulePostCheckInPayout({
        bookingId: updated.id,
        hostId: hostId,
        amountCents: Math.round(Number(updated.totalPrice) * 100),
        currency: updated.currency,
        checkIn: updated.checkIn,
      });
    }

    // Award loyalty points to the guest when stay is completed
    if (dto.status === BookingStatus.COMPLETED) {
      void this.loyalty.earnFromBooking(
        updated.guestId,
        Number(updated.totalPrice),
        updated.id,
      );
    }

    return updated;
  }

  async cancelByGuest(bookingId: string, guestId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { hostId: true, title: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== guestId) {
      throw new ForbiddenException();
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Это бронирование уже нельзя отменить');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: bookingInclude,
    });

    await this.notifications.create({
      userId: booking.listing.hostId,
      type: NotificationType.SYSTEM,
      title: 'Гость отменил бронирование',
      body: booking.listing.title,
      data: { bookingId: booking.id },
    });

    // Notify the host via email (fire-and-forget)
    const host = await this.prisma.user.findUnique({
      where: { id: booking.listing.hostId },
      select: { email: true, profile: { select: { firstName: true } } },
    });

    if (host) {
      void this.emailService.sendBookingCancellation({
        to: host.email,
        recipientName: host.profile?.firstName ?? 'Хост',
        listingTitle: booking.listing.title,
        checkIn: booking.checkIn,
        bookingId: booking.id,
      });
    }

    return updated;
  }

  async guestBookings(guestId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { guestId },
        skip,
        take: limit,
        orderBy: { checkIn: Prisma.SortOrder.desc },
        include: bookingInclude,
      }),
      this.prisma.booking.count({ where: { guestId } }),
    ]);

    return { items, meta: { page, limit, total } };
  }

  async hostBookings(hostId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: { listing: { hostId } },
        skip,
        take: limit,
        orderBy: { checkIn: Prisma.SortOrder.desc },
        include: bookingInclude,
      }),
      this.prisma.booking.count({ where: { listing: { hostId } } }),
    ]);

    return { items, meta: { page, limit, total } };
  }

  async findOne(bookingId: string, userId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (
      booking.guestId !== userId &&
      booking.listing.hostId !== userId &&
      role !== 'ADMIN'
    ) {
      throw new ForbiddenException();
    }

    return booking;
  }

  async getBookingStats(userId: string, role: string) {
    let whereCondition: Prisma.BookingWhereInput = {};

    if (role === 'GUEST') {
      whereCondition = { guestId: userId };
    } else if (role === 'HOST') {
      whereCondition = { listing: { hostId: userId } };
    }

    const stats = await this.prisma.booking.groupBy({
      by: ['status'],
      where: whereCondition,
      _count: {
        id: true,
      },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
