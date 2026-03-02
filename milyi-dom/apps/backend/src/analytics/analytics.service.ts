import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MonthlyRevenue {
  month: string; // "2025-01"
  revenue: number;
  bookingsCount: number;
}

export interface ListingPerformance {
  listingId: string;
  title: string;
  city: string;
  revenue: number;
  bookingsCount: number;
  occupancyRate: number;
  avgRating: number;
}

export interface HostAnalytics {
  totalRevenue: number;
  totalBookings: number;
  avgOccupancyRate: number;
  monthlyRevenue: MonthlyRevenue[];
  listingPerformance: ListingPerformance[];
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHostAnalytics(hostId: string): Promise<HostAnalytics> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all host listings
    const listings = await this.prisma.listing.findMany({
      where: { hostId },
      select: {
        id: true,
        title: true,
        city: true,
        rating: true,
        reviewCount: true,
      },
    });

    const listingIds = listings.map((l) => l.id);

    if (listingIds.length === 0) {
      return this.emptyAnalytics();
    }

    // Fetch completed/confirmed bookings in last 12 months
    const bookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        id: true,
        listingId: true,
        totalPrice: true,
        checkIn: true,
        checkOut: true,
        createdAt: true,
        status: true,
      },
    });

    // Upcoming check-ins (next 7 days)
    const upcomingCheckIns = await this.prisma.booking.count({
      where: {
        listingId: { in: listingIds },
        status: BookingStatus.CONFIRMED,
        checkIn: { gte: now, lte: next7Days },
      },
    });

    // Upcoming check-outs (next 7 days)
    const upcomingCheckOuts = await this.prisma.booking.count({
      where: {
        listingId: { in: listingIds },
        status: BookingStatus.CONFIRMED,
        checkOut: { gte: now, lte: next7Days },
      },
    });

    // Monthly revenue aggregation
    const monthlyMap = new Map<string, { revenue: number; count: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { revenue: 0, count: 0 });
    }

    let totalRevenue = 0;
    for (const booking of bookings) {
      const d = booking.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const price = Number(booking.totalPrice);
      totalRevenue += price;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.revenue += price;
        entry.count += 1;
      }
    }

    const monthlyRevenue: MonthlyRevenue[] = Array.from(monthlyMap.entries()).map(
      ([month, { revenue, count }]) => ({ month, revenue, bookingsCount: count }),
    );

    // Per-listing performance
    const listingBookingsMap = new Map<
      string,
      { revenue: number; nights: number; bookingsCount: number }
    >();
    for (const l of listings) {
      listingBookingsMap.set(l.id, { revenue: 0, nights: 0, bookingsCount: 0 });
    }

    for (const booking of bookings) {
      const entry = listingBookingsMap.get(booking.listingId);
      if (!entry) continue;
      entry.revenue += Number(booking.totalPrice);
      entry.bookingsCount += 1;
      const nights = Math.ceil(
        (booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      entry.nights += nights;
    }

    const daysInPeriod = 365;
    const listingPerformance: ListingPerformance[] = listings.map((listing) => {
      const stats = listingBookingsMap.get(listing.id)!;
      return {
        listingId: listing.id,
        title: listing.title,
        city: listing.city,
        revenue: stats.revenue,
        bookingsCount: stats.bookingsCount,
        occupancyRate: Math.min(100, Math.round((stats.nights / daysInPeriod) * 100)),
        avgRating: Number(listing.rating ?? 0),
      };
    });

    listingPerformance.sort((a, b) => b.revenue - a.revenue);

    const avgOccupancyRate =
      listingPerformance.length > 0
        ? Math.round(
            listingPerformance.reduce((sum, l) => sum + l.occupancyRate, 0) /
              listingPerformance.length,
          )
        : 0;

    return {
      totalRevenue,
      totalBookings: bookings.length,
      avgOccupancyRate,
      monthlyRevenue,
      listingPerformance,
      upcomingCheckIns,
      upcomingCheckOuts,
    };
  }

  private emptyAnalytics(): HostAnalytics {
    const now = new Date();
    const monthlyRevenue: MonthlyRevenue[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.push({ month, revenue: 0, bookingsCount: 0 });
    }
    return {
      totalRevenue: 0,
      totalBookings: 0,
      avgOccupancyRate: 0,
      monthlyRevenue,
      listingPerformance: [],
      upcomingCheckIns: 0,
      upcomingCheckOuts: 0,
    };
  }

  async getAdminAnalytics(): Promise<{
    totalUsers: number;
    totalHosts: number;
    totalListings: number;
    totalBookings: number;
    totalRevenue: number;
    gmv30d: number;
    newUsers30d: number;
    conversionRate: number;
    topCities: { city: string; count: number }[];
    queueStats?: Record<string, unknown>;
  }> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalHosts,
      totalListings,
      totalBookings,
      newUsers30d,
      bookings30d,
      revenueAgg,
      gmvAgg,
      cityRows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'HOST' } }),
      this.prisma.listing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.booking.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.listing.groupBy({
        by: ['city'],
        _count: { id: true },
        where: { status: 'PUBLISHED' },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Rough conversion: completed bookings / total listings views
    // (simplified: bookings30d / max(1, totalListings))
    const conversionRate =
      totalListings > 0
        ? Math.min(100, Math.round((bookings30d / totalListings) * 100))
        : 0;

    return {
      totalUsers,
      totalHosts,
      totalListings,
      totalBookings,
      totalRevenue: Number(revenueAgg._sum.amount ?? 0),
      gmv30d: Number(gmvAgg._sum.amount ?? 0),
      newUsers30d,
      conversionRate,
      topCities: cityRows.map((r) => ({ city: r.city, count: r._count.id })),
    };
  }
}
