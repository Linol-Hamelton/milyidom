import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        listings: {
          where: { status: 'PUBLISHED' },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            reviews: {
              take: 5,
            },
          },
        },
        bookings: {
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
        },
        favorites: {
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
                reviews: {
                  take: 5,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateMe(userId: string, updateMeDto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Parameters<typeof this.prisma.user.update>[0]['data'] = {
      lastActiveAt: new Date(),
    };

    if (updateMeDto.user?.phone) {
      data.phone = updateMeDto.user.phone;
    }

    if (updateMeDto.profile) {
      const profileData = updateMeDto.profile;
      if (user.profile) {
        data.profile = {
          update: {
            ...profileData,
            languages: profileData.languages ?? user.profile.languages,
          },
        };
      } else {
        data.profile = {
          create: {
            firstName: profileData.firstName ?? '',
            lastName: profileData.lastName ?? '',
            avatarUrl: profileData.avatarUrl,
            bio: profileData.bio,
            languages: profileData.languages ?? [],
          },
        };
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: { profile: true },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.profile) {
      return this.prisma.profile.update({
        where: { userId },
        data: {
          ...updateProfileDto,
          languages: updateProfileDto.languages ?? user.profile.languages,
        },
      });
    } else {
      return this.prisma.profile.create({
        data: {
          firstName: updateProfileDto.firstName ?? '',
          lastName: updateProfileDto.lastName ?? '',
          avatarUrl: updateProfileDto.avatarUrl,
          bio: updateProfileDto.bio,
          languages: updateProfileDto.languages ?? [],
          userId,
        },
      });
    }
  }

  async getTopHosts(limit: number = 10) {
    return this.prisma.user.findMany({
      where: {
        role: 'HOST',
        isSuperhost: true,
        isVerified: true,
      },
      include: {
        profile: true,
        listings: {
          where: { status: 'PUBLISHED' },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            reviews: {
              take: 5,
            },
          },
        },
        reviews: {
          where: {
            listing: {
              hostId: { not: undefined },
            },
          },
        },
      },
      orderBy: {
        reviews: {
          _count: 'desc',
        },
      },
      take: limit,
    });
  }

  async getUserStats(userId: string) {
    const [listings, bookings, reviews, favorites] = await Promise.all([
      this.prisma.listing.count({
        where: { hostId: userId },
      }),
      this.prisma.booking.count({
        where: { guestId: userId },
      }),
      this.prisma.review.count({
        where: { authorId: userId },
      }),
      this.prisma.favorite.count({
        where: { userId },
      }),
    ]);

    return {
      listings,
      bookings,
      reviews,
      favorites,
    };
  }

  async verifyUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        lastActiveAt: new Date(),
      },
    });
  }

  async promoteToSuperhost(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        listings: {
          where: { status: 'PUBLISHED' },
        },
        reviews: {
          where: {
            listing: {
              hostId: userId,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hasEnoughListings = user.listings.length >= 1;
    const hasEnoughReviews = user.reviews.length >= 3;
    const averageRating =
      user.reviews.length > 0
        ? user.reviews.reduce((acc, review) => acc + review.rating, 0) /
          user.reviews.length
        : 0;
    const hasHighRating = averageRating >= 4.8;

    if (hasEnoughListings && hasEnoughReviews && hasHighRating) {
      return this.prisma.user.update({
        where: { id: userId },
        data: {
          isSuperhost: true,
        },
      });
    }

    throw new BadRequestException('User does not meet superhost criteria');
  }
}
