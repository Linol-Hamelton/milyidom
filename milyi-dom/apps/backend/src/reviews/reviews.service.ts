import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const {
      bookingId,
      rating,
      comment,
      cleanliness,
      communication,
      checkIn,
      accuracy,
      location,
      value,
    } = createReviewDto;

    // Check if booking exists and belongs to user
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: true,
        review: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }

    if (booking.guestId !== userId) {
      throw new ForbiddenException('Оставить отзыв можно только по своему бронированию');
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Отзыв можно оставить только после завершения поездки');
    }

    // Check if review already exists
    if (booking.review) {
      throw new BadRequestException('Отзыв по этому бронированию уже существует');
    }

    // Check if check-out date has passed
    const now = new Date();
    if (booking.checkOut > now) {
      throw new BadRequestException('Отзыв можно оставить только после даты выезда');
    }

    // Validate detailed ratings
    const detailedRatings = [
      cleanliness,
      communication,
      checkIn,
      accuracy,
      location,
      value,
    ];
    const isValidRatings = detailedRatings.every((r) => r >= 1 && r <= 5);

    if (!isValidRatings) {
      throw new BadRequestException('Оценки должны быть от 1 до 5');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        rating,
        comment,
        listingId: booking.listingId,
        bookingId,
        authorId: userId,
        cleanliness,
        communication,
        checkIn,
        accuracy,
        location,
        value,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        listing: {
          include: {
            host: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Update listing stats
    await this.prisma.updateListingStats(booking.listingId);

    // Auto-update superhost status for the host (fire-and-forget)
    void this.usersService.checkAndUpdateSuperhostStatus(review.listing.hostId);

    return review;
  }

  async findByListing(listingId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          listingId,
          isPublic: true,
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          listingId,
          isPublic: true,
        },
      }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFeaturedReviews(limit: number = 5) {
    return this.prisma.review.findMany({
      where: {
        isFeatured: true,
        isPublic: true,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        listing: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findUserReviews(userId: string) {
    return this.prisma.review.findMany({
      where: {
        authorId: userId,
      },
      include: {
        listing: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            host: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findHostReviews(hostId: string) {
    return this.prisma.review.findMany({
      where: {
        listing: {
          hostId,
        },
        isPublic: true,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        listing: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReviewStats(listingId: string) {
    const stats = await this.prisma.review.aggregate({
      where: { listingId },
      _avg: {
        rating: true,
        cleanliness: true,
        communication: true,
        checkIn: true,
        accuracy: true,
        location: true,
        value: true,
      },
      _count: true,
    });

    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { listingId },
      _count: {
        rating: true,
      },
    });

    return {
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count,
      detailedRatings: {
        cleanliness: stats._avg.cleanliness || 0,
        communication: stats._avg.communication || 0,
        checkIn: stats._avg.checkIn || 0,
        accuracy: stats._avg.accuracy || 0,
        location: stats._avg.location || 0,
        value: stats._avg.value || 0,
      },
      ratingDistribution: ratingDistribution.reduce(
        (acc, item) => {
          acc[item.rating] = item._count.rating;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }

  async toggleFeatured(reviewId: string, userId: string, isFeatured: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        listing: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Отзыв не найден');
    }

    // Only host or admin can feature reviews
    const isHost = review.listing.hostId === userId;
    if (!isHost) {
      throw new ForbiddenException('Только хозяин может выделять отзывы');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isFeatured },
    });
  }

  async replyToReview(reviewId: string, hostId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { listing: { select: { hostId: true } } },
    });

    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.listing.hostId !== hostId) {
      throw new ForbiddenException('Ответить на отзыв может только хозяин объявления');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { hostReply: reply.trim(), hostRepliedAt: new Date() },
    });
  }

  async deleteReplyToReview(reviewId: string, hostId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { listing: { select: { hostId: true } } },
    });

    if (!review) throw new NotFoundException('Отзыв не найден');
    if (review.listing.hostId !== hostId) {
      throw new ForbiddenException('Удалить ответ может только хозяин объявления');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { hostReply: null, hostRepliedAt: null },
    });
  }

  async adminHideReview(reviewId: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isHidden: true },
    });
  }

  async adminDeleteReview(reviewId: string) {
    return this.prisma.review.delete({ where: { id: reviewId } });
  }

  async adminFindAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
          listing: { select: { id: true, title: true } },
        },
      }),
      this.prisma.review.count(),
    ]);
    return { items, meta: { page, limit, total } };
  }
}
