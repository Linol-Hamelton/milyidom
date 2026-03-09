import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async subscribe(emailAddress: string): Promise<{ message: string }> {
    const normalized = emailAddress.trim().toLowerCase();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalized },
    });

    if (existing) {
      throw new ConflictException('Этот email уже подписан на рассылку.');
    }

    await this.prisma.newsletterSubscriber.create({
      data: { email: normalized },
    });

    this.logger.log(`Newsletter subscription: ${normalized}`);

    await this.email.sendNewsletterWelcome(normalized).catch((err: unknown) => {
      this.logger.warn(`Welcome email failed for ${normalized}: ${String(err)}`);
    });

    return { message: 'Подписка оформлена!' };
  }
}
