import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { BookingStatus, DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDisputeDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== userId) {
      throw new ForbiddenException('You can only dispute your own bookings');
    }

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Disputes can only be opened for confirmed or completed bookings',
      );
    }

    const existing = await this.prisma.dispute.findFirst({
      where: { bookingId: dto.bookingId, status: { in: ['OPEN', 'IN_REVIEW'] } },
    });

    if (existing) {
      throw new BadRequestException('An open dispute already exists for this booking');
    }

    return this.prisma.dispute.create({
      data: {
        bookingId: dto.bookingId,
        reporterId: userId,
        subject: dto.subject,
        description: dto.description,
      },
    });
  }

  async findMyDisputes(userId: string) {
    return this.prisma.dispute.findMany({
      where: { reporterId: userId },
      include: {
        booking: {
          include: {
            listing: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, limit = 20, status?: DisputeStatus) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          booking: {
            include: {
              listing: { select: { id: true, title: true, slug: true } },
              guest: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
            },
          },
          reporter: {
            select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return { items, meta: { page, limit, total } };
  }

  async resolve(id: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
        resolvedAt:
          dto.status === DisputeStatus.RESOLVED || dto.status === DisputeStatus.CLOSED
            ? new Date()
            : undefined,
      },
    });
  }
}
