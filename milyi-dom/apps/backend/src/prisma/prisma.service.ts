import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Custom methods for common queries
  async findListingsWithFilters(params: {
    city?: string;
    guests?: number;
    checkIn?: Date;
    checkOut?: Date;
    minPrice?: number;
    maxPrice?: number;
    amenities?: number[];
    page?: number;
    limit?: number;
  }) {
    const {
      city,
      guests,
      checkIn,
      checkOut,
      minPrice,
      maxPrice,
      amenities,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.ListingWhereInput = {
      status: 'PUBLISHED',
    };

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (guests) {
      where.guests = { gte: guests };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    if (amenities && amenities.length > 0) {
      where.amenities = {
        some: {
          amenityId: { in: amenities },
        },
      };
    }

    // Date availability check
    if (checkIn && checkOut) {
      where.NOT = {
        bookings: {
          some: {
            AND: [
              { status: { in: ['CONFIRMED', 'PENDING'] } },
              {
                OR: [
                  {
                    AND: [
                      { checkIn: { lte: checkOut } },
                      { checkOut: { gte: checkIn } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      };
    }

    const [listings, total] = await Promise.all([
      this.listing.findMany({
        where,
        include: {
          host: {
            include: {
              profile: true,
            },
          },
          images: {
            take: 1,
          },
          amenities: {
            include: {
              amenity: true,
            },
          },
          reviews: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      this.listing.count({ where }),
    ]);

    return {
      listings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFeaturedListings() {
    return this.listing.findMany({
      where: {
        status: 'PUBLISHED',
      },
      include: {
        host: {
          include: {
            profile: true,
          },
        },
        images: {
          take: 1,
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { rating: 'desc' },
      take: 8,
    });
  }

  async findListingBySlug(slug: string) {
    return this.listing.findUnique({
      where: { slug },
      include: {
        host: {
          include: {
            profile: true,
            listings: {
              where: {
                status: 'PUBLISHED',
                slug: { not: slug }, // Exclude current listing
              },
              take: 3,
              include: {
                images: {
                  take: 1,
                },
              },
            },
          },
        },
        images: {
          orderBy: { position: 'asc' },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            checkOut: { gte: new Date() },
          },
          select: {
            checkIn: true,
            checkOut: true,
          },
        },
      },
    });
  }

  async calculateListingStats(listingId: string) {
    const [reviews, bookings] = await Promise.all([
      this.review.aggregate({
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
      }),
      this.booking.count({
        where: {
          listingId,
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      averageRating: reviews._avg.rating || 0,
      reviewCount: reviews._count,
      completedBookings: bookings,
      detailedRatings: {
        cleanliness: reviews._avg.cleanliness || 0,
        communication: reviews._avg.communication || 0,
        checkIn: reviews._avg.checkIn || 0,
        accuracy: reviews._avg.accuracy || 0,
        location: reviews._avg.location || 0,
        value: reviews._avg.value || 0,
      },
    };
  }

  async updateListingStats(listingId: string) {
    const stats = await this.calculateListingStats(listingId);

    return this.listing.update({
      where: { id: listingId },
      data: {
        rating: stats.averageRating,
        reviewCount: stats.reviewCount,
      },
    });
  }
}
