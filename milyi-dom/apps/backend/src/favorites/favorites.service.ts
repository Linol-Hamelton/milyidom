import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
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
    });
  }

  async addToFavorites(userId: string, listingId: string) {
    // Check if listing exists
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if already in favorites
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_listingId: {
          userId,
          listingId,
        },
      },
    });

    if (existingFavorite) {
      throw new ConflictException('Listing already in favorites');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        listingId,
      },
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
