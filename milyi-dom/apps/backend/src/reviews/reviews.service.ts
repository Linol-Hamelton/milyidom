import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

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
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== userId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Can only review completed bookings');
    }

    // Check if review already exists
    if (booking.review) {
      throw new BadRequestException('Review already exists for this booking');
    }

    // Check if check-out date has passed
    const now = new Date();
    if (booking.checkOut > now) {
      throw new BadRequestException('Cannot review before check-out date');
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
      throw new BadRequestException('All ratings must be between 1 and 5');
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
      throw new NotFoundException('Review not found');
    }

    // Only host or admin can feature reviews
    const isHost = review.listing.hostId === userId;
    if (!isHost) {
      throw new ForbiddenException('Only the host can feature reviews');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isFeatured },
    });
  }
}
