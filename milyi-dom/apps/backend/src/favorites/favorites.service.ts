import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, pagination: PaginationDto = new PaginationDto()) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        include: {
          listing: {
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
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addToFavorites(userId: string, listingId: string) {
    // Check if listing exists
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Use upsert to avoid race condition on concurrent double-taps
    const favorite = await this.prisma.favorite.upsert({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
      create: {
        userId,
        listingId,
      },
      update: {},
      include: {
        listing: {
          include: {
            host: {
              include: {
                profile: true,
              },
            },
            images: {
              take: 1,
            },
          },
        },
      },
    });

    return favorite;
  }

  async removeFromFavorites(userId: string, listingId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return this.prisma.favorite.delete({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });
  }

  async isInFavorites(userId: string, listingId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }

  async getFavoritesCount(userId: string) {
    return this.prisma.favorite.count({
      where: { userId },
    });
  }
}
