import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
      services: {
        database: 'reachable',
      },
    };
  }

  async getStats() {
    const [
      usersCount,
      listingsCount,
      bookingsCount,
      reviewsCount,
      activeListings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count(),
      this.prisma.booking.count(),
      this.prisma.review.count(),
      this.prisma.listing.count({
        where: { status: 'PUBLISHED' },
      }),
    ]);

    return {
      users: usersCount,
      listings: listingsCount,
      activeListings,
      bookings: bookingsCount,
      reviews: reviewsCount,
    };
  }

  async getPopularCities() {
    const cities = await this.prisma.listing.groupBy({
      by: ['city'],
      where: {
        status: 'PUBLISHED',
      },
      _count: {
        city: true,
      },
      orderBy: {
        _count: {
          city: 'desc',
        },
      },
      take: 10,
    });

    return cities.map((city) => ({
      name: city.city,
      listingsCount: city._count.city,
    }));
  }
}
