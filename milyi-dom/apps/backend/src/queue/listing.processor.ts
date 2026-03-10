import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { AiSearchService } from '../ai-search/ai-search.service';
import { AuditService } from '../audit/audit.service';
import { LISTING_QUEUE, LISTING_JOB } from './queue.constants';
import { FraudCheckJobData } from './listing-queue.service';

@Processor(LISTING_QUEUE)
export class ListingProcessor {
  private readonly logger = new Logger(ListingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSearchService: AiSearchService,
    private readonly auditService: AuditService,
  ) {}

  @Process(LISTING_JOB.FRAUD_CHECK)
  async handleFraudCheck(job: Job<FraudCheckJobData>): Promise<void> {
    const { listingId, title, description, basePrice, city, country } = job.data;
    this.logger.log(`Running fraud check for listing ${listingId}`);

    try {
      const result = await this.aiSearchService.detectFraud({
        title,
        description,
        basePrice,
        city,
        country,
      });

      if (result.isFraud) {
        await this.prisma.listing.update({
          where: { id: listingId },
          data: { status: 'UNLISTED' },
        });

        await this.auditService.log({
          action: 'ADMIN_LISTING_MODERATE',
          resourceType: 'Listing',
          resourceId: listingId,
          metadata: { automated: true, fraudReason: result.reason },
          success: true,
        });

        this.logger.warn(
          `Listing ${listingId} flagged as fraud and set to UNLISTED. Reason: ${result.reason}`,
        );
      } else {
        this.logger.log(`Listing ${listingId} passed fraud check`);
      }
    } catch (err) {
      this.logger.error(`Fraud check failed for listing ${listingId}: ${String(err)}`);
      // Re-throw so Bull retries the job
      throw err;
    }
  }
}
