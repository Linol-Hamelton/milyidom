import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';

const SUPERHOST_MIN_RATING = 4.8;
const SUPERHOST_MIN_REVIEWS = 10;

@Injectable()
export class SuperhostService {
  private readonly logger = new Logger(SuperhostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  /** Runs daily at 02:00 UTC */
  @Cron('0 2 * * *')
  async evaluateSuperhost(): Promise<void> {
    this.logger.log('Running superhost evaluation cron...');

    // Find all active hosts
    const hosts = await this.prisma.user.findMany({
      where: { role: 'HOST', blockedAt: null },
      select: {
        id: true,
        email: true,
        isSuperhost: true,
        profile: { select: { firstName: true } },
        listings: {
          select: { rating: true, reviewCount: true },
        },
      },
    });

    let promoted = 0;
    let demoted = 0;

    for (const host of hosts) {
      const qualifies = host.listings.some(
        (l) =>
          l.rating !== null &&
          l.rating >= SUPERHOST_MIN_RATING &&
          l.reviewCount >= SUPERHOST_MIN_REVIEWS,
      );

      if (qualifies && !host.isSuperhost) {
        // Promote
        await this.prisma.user.update({
          where: { id: host.id },
          data: { isSuperhost: true },
        });
        const firstName = host.profile?.firstName ?? 'Хост';
        void this.emailQueue.sendSuperhostPromotion(host.email, firstName);
        this.logger.log(`Promoted to Superhost: ${host.email}`);
        promoted++;
      } else if (!qualifies && host.isSuperhost) {
        // Demote silently
        await this.prisma.user.update({
          where: { id: host.id },
          data: { isSuperhost: false },
        });
        this.logger.log(`Demoted from Superhost: ${host.email}`);
        demoted++;
      }
    }

    this.logger.log(`Superhost evaluation done — promoted: ${promoted}, demoted: ${demoted}`);
  }
}
