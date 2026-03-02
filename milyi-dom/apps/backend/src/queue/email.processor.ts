import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailService } from '../email/email.service';
import { EMAIL_QUEUE, EMAIL_JOB } from './queue.constants';

// ── Job payload types ────────────────────────────────────────────────────────

interface WelcomeJobData {
  email: string;
  firstName: string;
}

interface PasswordResetJobData {
  email: string;
  token: string;
}

interface BookingConfirmationJobData {
  to: string;
  guestName: string;
  listingTitle: string;
  checkIn: string; // ISO string (serializable over Redis)
  checkOut: string;
  totalPrice: number;
  currency: string;
  bookingId: string;
}

interface BookingRequestJobData {
  to: string;
  hostName: string;
  guestName: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
}

interface BookingCancellationJobData {
  to: string;
  recipientName: string;
  listingTitle: string;
  checkIn: string;
  bookingId: string;
}

// ── Processor ────────────────────────────────────────────────────────────────

@Processor(EMAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process(EMAIL_JOB.WELCOME)
  async handleWelcome(job: Job<WelcomeJobData>) {
    this.logger.debug(`Processing welcome email for ${job.data.email}`);
    await this.emailService.sendWelcome(job.data.email, job.data.firstName);
  }

  @Process(EMAIL_JOB.PASSWORD_RESET)
  async handlePasswordReset(job: Job<PasswordResetJobData>) {
    this.logger.debug(`Processing password reset email for ${job.data.email}`);
    await this.emailService.sendPasswordReset(job.data.email, job.data.token);
  }

  @Process(EMAIL_JOB.EMAIL_VERIFY)
  async handleEmailVerify(job: Job<PasswordResetJobData>) {
    this.logger.debug(`Processing email verification for ${job.data.email}`);
    await this.emailService.sendEmailVerification(job.data.email, job.data.token);
  }

  @Process(EMAIL_JOB.BOOKING_CONFIRMATION)
  async handleBookingConfirmation(job: Job<BookingConfirmationJobData>) {
    this.logger.debug(`Processing booking confirmation email [${job.data.bookingId}]`);
    await this.emailService.sendBookingConfirmation({
      ...job.data,
      checkIn: new Date(job.data.checkIn),
      checkOut: new Date(job.data.checkOut),
    });
  }

  @Process(EMAIL_JOB.BOOKING_REQUEST)
  async handleBookingRequest(job: Job<BookingRequestJobData>) {
    this.logger.debug(`Processing booking request email [${job.data.bookingId}]`);
    await this.emailService.sendBookingRequest({
      ...job.data,
      checkIn: new Date(job.data.checkIn),
      checkOut: new Date(job.data.checkOut),
    });
  }

  @Process(EMAIL_JOB.BOOKING_CANCELLATION)
  async handleBookingCancellation(job: Job<BookingCancellationJobData>) {
    this.logger.debug(`Processing booking cancellation email [${job.data.bookingId}]`);
    await this.emailService.sendBookingCancellation({
      ...job.data,
      checkIn: new Date(job.data.checkIn),
    });
  }

  @Process(EMAIL_JOB.PAYOUT_SENT)
  async handlePayoutSent(
    job: Job<{
      to: string;
      hostName: string;
      amountFormatted: string;
      bookingId: string;
    }>,
  ) {
    this.logger.debug(`Processing payout email for booking ${job.data.bookingId}`);
    await this.emailService.sendPayoutNotification(job.data);
  }

  @Process(EMAIL_JOB.SUPERHOST_PROMO)
  async handleSuperhostPromo(job: Job<{ email: string; firstName: string }>) {
    this.logger.debug(`Processing superhost promo email for ${job.data.email}`);
    await this.emailService.sendSuperhostPromotion(job.data.email, job.data.firstName);
  }

  @Process(EMAIL_JOB.SAVED_SEARCH_ALERT)
  async handleSavedSearchAlert(
    job: Job<{
      email: string;
      firstName: string;
      searchName: string;
      newCount: number;
      searchUrl: string;
    }>,
  ) {
    this.logger.debug(`Processing saved-search alert for ${job.data.email}`);
    await this.emailService.sendSavedSearchAlert(job.data);
  }
}
