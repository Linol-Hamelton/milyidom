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
    const user = await this.prisma.user.findUnique({
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

    if (!user) return null;

    // Strip sensitive fields before returning to client
    const { password, twoFactorSecret, googleId, vkId, ...safeUser } = user;
    void password; void twoFactorSecret; void googleId; void vkId;
    return safeUser;
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

  /** GDPR: anonymize/delete user data (right to erasure) */
  async deleteMe(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bookings: { where: { status: 'CONFIRMED' } } },
    });
    if (!user) throw new NotFoundException('User not found');

    // Block deletion if active confirmed bookings exist
    if (user.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete account with active confirmed bookings. Cancel them first.',
      );
    }

    // Anonymize instead of hard delete (preserve audit trail and financial records)
    await this.prisma.$transaction([
      // Anonymize personal data
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@milyi-dom.deleted`,
          phone: null,
          password: '',
          googleId: null,
          vkId: null,
          twoFactorSecret: null,
          twoFactorEnabled: false,
          isVerified: false,
          isSuperhost: false,
        },
      }),
      // Anonymize profile
      this.prisma.profile.updateMany({
        where: { userId },
        data: {
          firstName: 'Удалённый',
          lastName: 'Пользователь',
          avatarUrl: null,
          bio: null,
          languages: [],
        },
      }),
    ]);

    return { message: 'Ваш аккаунт успешно удалён. Данные анонимизированы.' };
  }

  /** GDPR: export all user data (right to portability) */
  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        bookings: { include: { listing: { select: { title: true, city: true } } } },
        reviews: true,
        favorites: { include: { listing: { select: { title: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    // Strip sensitive fields
    const { password, twoFactorSecret, googleId, vkId, ...safeUser } = user;
    void password; void twoFactorSecret; void googleId; void vkId;

    return {
      exportedAt: new Date().toISOString(),
      data: safeUser,
    };
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

  /**
   * Automatically evaluate and update superhost status for a host.
   * Called after every review creation/deletion — fire-and-forget.
   * Criteria: ≥1 published listing, ≥5 reviews on their listings, avg rating ≥4.8.
   */
  async checkAndUpdateSuperhostStatus(hostId: string): Promise<void> {
    // Fetch all reviews about this host's listings
    const [publishedListingsCount, reviews] = await this.prisma.$transaction([
      this.prisma.listing.count({ where: { hostId, status: 'PUBLISHED' } }),
      this.prisma.review.findMany({
        where: { listing: { hostId } },
        select: { rating: true },
      }),
    ]);

    const hasListings = publishedListingsCount >= 1;
    const hasEnoughReviews = reviews.length >= 10;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
    const hasHighRating = avgRating >= 4.8;

    const qualifies = hasListings && hasEnoughReviews && hasHighRating;

    // Only update if the status needs to change (avoid unnecessary writes)
    const user = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: { isSuperhost: true },
    });
    if (user && user.isSuperhost !== qualifies) {
      await this.prisma.user.update({
        where: { id: hostId },
        data: { isSuperhost: qualifies },
      });
    }
  }

  async getNotificationPrefs(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifEmailBookings: true,
        notifEmailMessages: true,
        notifEmailSavedSearches: true,
        notifEmailMarketing: true,
      },
    });
  }

  async updateNotificationPrefs(
    userId: string,
    dto: {
      notifEmailBookings?: boolean;
      notifEmailMessages?: boolean;
      notifEmailSavedSearches?: boolean;
      notifEmailMarketing?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        notifEmailBookings: true,
        notifEmailMessages: true,
        notifEmailSavedSearches: true,
        notifEmailMarketing: true,
      },
    });
  }

  async registerPushToken(userId: string, token: string) {
    // Clear any existing registration of this token (another user logged out)
    await this.prisma.user.updateMany({
      where: { pushToken: token, NOT: { id: userId } },
      data: { pushToken: null },
    });
    return this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
      select: { id: true },
    });
  }
}
