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
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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
        bookings: {
          where: {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
          select: { checkIn: true, checkOut: true },
        },
      },
    });

    if (!listing || listing.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException('Listing not available');
    }

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (listing.minNights && nights < listing.minNights) {
      throw new BadRequestException(
        `Minimum stay is ${listing.minNights} nights`,
      );
    }

    if (listing.maxNights && nights > listing.maxNights) {
      throw new BadRequestException(
        `Maximum stay is ${listing.maxNights} nights`,
      );
    }

    const overlap = listing.bookings.some(
      (booking) => checkIn < booking.checkOut && checkOut > booking.checkIn,
    );

    if (overlap) {
      throw new BadRequestException('Requested dates are not available');
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
        ? 'Instant booking confirmed'
        : 'New booking request',
      body: `${listing.title} - ${nights} nights`,
      data: { listingId: listing.id, bookingId: booking.id },
    });

    await this.notifications.create({
      userId: guestId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: listing.instantBook
        ? 'Your stay is confirmed'
        : 'Booking request sent',
      body: `${listing.title} - ${nights} nights`,
      data: { listingId: listing.id, bookingId: booking.id },
    });

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
          ? 'Host confirmed your stay'
          : 'Booking status updated',
      body: `${booking.listing.title} - status: ${dto.status.toLowerCase()}`,
      data: { bookingId: updated.id, status: dto.status },
    });

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
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
      include: bookingInclude,
    });

    await this.notifications.create({
      userId: booking.listing.hostId,
      type: NotificationType.SYSTEM,
      title: 'Guest cancelled the booking',
      body: booking.listing.title,
      data: { bookingId: booking.id },
    });

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
