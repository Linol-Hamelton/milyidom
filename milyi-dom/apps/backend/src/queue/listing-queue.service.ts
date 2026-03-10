import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LISTING_QUEUE, LISTING_JOB } from './queue.constants';

export interface FraudCheckJobData {
  listingId: string;
  title: string;
  description: string;
  basePrice: number;
  city: string;
  country: string;
}

@Injectable()
export class ListingQueueService {
  private readonly logger = new Logger(ListingQueueService.name);

  constructor(@InjectQueue(LISTING_QUEUE) private readonly listingQueue: Queue) {}

  async enqueueFraudCheck(data: FraudCheckJobData): Promise<void> {
    await this.listingQueue.add(LISTING_JOB.FRAUD_CHECK, data, {
      attempts: 2,
      backoff: { type: 'fixed', delay: 3000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    });
    this.logger.log(`Fraud check queued for listing ${data.listingId}`);
  }
}
