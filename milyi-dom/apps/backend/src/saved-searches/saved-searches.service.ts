import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SavedSearchesService {
  private readonly logger = new Logger(SavedSearchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: dto.filters as Prisma.InputJsonValue,
        notifyEmail: dto.notifyEmail ?? true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const search = await this.prisma.savedSearch.findUnique({ where: { id } });
    if (!search || search.userId !== userId) {
      throw new NotFoundException('Saved search not found');
    }
    await this.prisma.savedSearch.delete({ where: { id } });
    return { success: true };
  }

  // ── Daily alert: every day at 08:00 UTC ──────────────────────────────────────

  @Cron('0 8 * * *')
  async sendDailyAlerts() {
    this.logger.log('Running saved-search daily alert job');
    const frontendUrl = this.config.get<string>('frontend.url', 'http://localhost:3000');

    const searches = await this.prisma.savedSearch.findMany({
      where: { notifyEmail: true },
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true } },
          },
        },
      },
    });

    for (const search of searches) {
      try {
        const filters = search.filters as Record<string, unknown>;
        const city = filters['city'] as string | undefined;
        const minPrice = filters['minPrice'] ? Number(filters['minPrice']) : undefined;
        const maxPrice = filters['maxPrice'] ? Number(filters['maxPrice']) : undefined;
        const guests = filters['guests'] ? Number(filters['guests']) : undefined;

        const newListings = await this.prisma.listing.count({
          where: {
            status: ListingStatus.PUBLISHED,
            createdAt: { gt: search.lastCheckedAt },
            ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
            ...(minPrice !== undefined ? { basePrice: { gte: minPrice } } : {}),
            ...(maxPrice !== undefined ? { basePrice: { lte: maxPrice } } : {}),
            ...(guests !== undefined ? { guests: { gte: guests } } : {}),
          },
        });

        if (newListings > 0) {
          const params = new URLSearchParams();
          if (city) params.set('city', city);
          if (minPrice) params.set('minPrice', String(minPrice));
          if (maxPrice) params.set('maxPrice', String(maxPrice));
          if (guests) params.set('guests', String(guests));

          const firstName = search.user.profile?.firstName ?? search.user.email.split('@')[0];
          await this.emailQueue.sendSavedSearchAlert({
            email: search.user.email,
            firstName,
            searchName: search.name,
            newCount: newListings,
            searchUrl: `${frontendUrl}/listings?${params.toString()}`,
          });
          this.logger.log(`Alert sent to ${search.user.email} for search "${search.name}" (${newListings} new)`);
        }

        // Update lastCheckedAt
        await this.prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastCheckedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Failed to process alert for search ${search.id}:`, err);
      }
    }
  }
}
