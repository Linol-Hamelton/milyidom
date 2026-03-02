import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, AuditAction, ListingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SearchService } from '../search/search.service';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';
import { GetAdminListingsDto } from './dto/get-admin-listings.dto';
import { GetAuditLogDto } from './dto/get-audit-log.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly searchService: SearchService,
  ) {}

  // ── Users ───────────────────────────────────────────────────────────────────

  async getUsers(dto: GetAdminUsersDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isVerified !== undefined && { isVerified: dto.isVerified }),
      ...(dto.isSuperhost !== undefined && { isSuperhost: dto.isSuperhost }),
      ...(dto.blocked === true && { NOT: { blockedAt: null } }),
      ...(dto.blocked === false && { blockedAt: null }),
      ...(dto.search && {
        email: { contains: dto.search, mode: 'insensitive' as const },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          _count: { select: { listings: true, bookings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, meta: { page, limit, total } };
  }

  async changeUserRole(
    adminId: string,
    adminEmail: string,
    targetId: string,
    role: Role,
  ) {
    if (adminId === targetId) {
      throw new BadRequestException('Cannot change your own role');
    }

    // Prevent demoting the last admin
    if (role !== Role.ADMIN) {
      const target = await this.prisma.user.findUnique({
        where: { id: targetId },
      });
      if (!target) throw new NotFoundException('User not found');
      if (target.role === Role.ADMIN) {
        const adminCount = await this.prisma.user.count({
          where: { role: Role.ADMIN },
        });
        if (adminCount <= 1) {
          throw new BadRequestException('Cannot demote the last admin');
        }
      }
    }

    const user = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
    });

    void this.auditService.log({
      userId: adminId,
      userEmail: adminEmail,
      action: AuditAction.ADMIN_USER_ROLE_CHANGE,
      resourceType: 'User',
      resourceId: targetId,
      metadata: { newRole: role },
    });

    return user;
  }

  async blockUser(
    adminId: string,
    adminEmail: string,
    targetId: string,
    blocked: boolean,
  ) {
    if (adminId === targetId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const user = await this.prisma.user.update({
      where: { id: targetId },
      data: { blockedAt: blocked ? new Date() : null },
    });

    void this.auditService.log({
      userId: adminId,
      userEmail: adminEmail,
      action: AuditAction.ADMIN_USER_BLOCK,
      resourceType: 'User',
      resourceId: targetId,
      metadata: { blocked },
    });

    return user;
  }

  // ── Listings ─────────────────────────────────────────────────────────────────

  async getListings(dto: GetAdminListingsDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ListingWhereInput = {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.city && { city: { contains: dto.city, mode: 'insensitive' as const } }),
        ...(dto.search && {
          title: { contains: dto.search, mode: 'insensitive' as const },
        }),
      };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          host: { include: { profile: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { items, meta: { page, limit, total } };
  }

  async moderateListing(
    adminId: string,
    adminEmail: string,
    listingId: string,
    status: ListingStatus,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status },
      include: {
        amenities: { include: { amenity: true } },
      },
    });

    // Keep Typesense in sync
    if (status === ListingStatus.PUBLISHED) {
      void this.searchService.indexListing({
        id: updated.id,
        title: updated.title,
        description: updated.description ?? '',
        city: updated.city,
        country: updated.country,
        pricePerNight:
          updated.basePrice instanceof Prisma.Decimal
            ? updated.basePrice.toNumber()
            : Number(updated.basePrice),
        maxGuests: updated.guests,
        bedroomsCount: updated.bedrooms,
        bathroomsCount:
          updated.bathrooms instanceof Prisma.Decimal
            ? updated.bathrooms.toNumber()
            : Number(updated.bathrooms),
        rating: Number(updated.rating ?? 0),
        reviewsCount: updated.reviewCount,
        isSuperhost: false,
        amenities: updated.amenities.map((a) => a.amenity.name),
        status: updated.status,
      });
    } else {
      void this.searchService.deleteListing(listingId);
    }

    void this.auditService.log({
      userId: adminId,
      userEmail: adminEmail,
      action: AuditAction.ADMIN_LISTING_MODERATE,
      resourceType: 'Listing',
      resourceId: listingId,
      metadata: { newStatus: status, previousStatus: listing.status },
    });

    return updated;
  }

  // ── Audit Log ─────────────────────────────────────────────────────────────────

  async getAuditLog(dto: GetAuditLogDto) {
    return this.auditService.findAll({
      userId: dto.userId,
      action: dto.action,
      resourceType: dto.resourceType,
      fromDate: dto.fromDate ? new Date(dto.fromDate) : undefined,
      toDate: dto.toDate ? new Date(dto.toDate) : undefined,
      page: dto.page,
      limit: dto.limit ?? 50,
    });
  }

  // ── Platform stats ────────────────────────────────────────────────────────────

  async getPlatformStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalListings,
      totalBookings,
      newUsers30d,
      revenueResult,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.listing.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.booking.count(),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalListings,
      totalBookings,
      newUsers30d,
      gmv30d: Number(revenueResult._sum.amount ?? 0),
    };
  }
}
