import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/types/current-user.type.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  createPaymentIntent(
    @CurrentUser() user: CurrentUserType,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      user.id,
      createPaymentIntentDto,
    );
  }

  @Patch(':bookingId/confirm')
  @UseGuards(JwtAuthGuard)
  confirmPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentsService.confirmPayment(bookingId, user.id);
  }

  @Get(':bookingId/status')
  @UseGuards(JwtAuthGuard)
  getPaymentStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentsService.getPaymentStatus(bookingId, user.id);
  }

  @Patch(':bookingId/refund')
  @UseGuards(JwtAuthGuard)
  refundPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.paymentsService.refundPayment(bookingId, user.id);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = request.rawBody ?? (request.body as Buffer);
    await this.paymentsService.handleWebhook(signature, rawBody);
    return { received: true };
  }

  @Get('host/earnings')
  @UseGuards(JwtAuthGuard)
  getHostEarnings(
    @CurrentUser() user: CurrentUserType,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.paymentsService.getHostEarnings(user.id, period);
  }
}
