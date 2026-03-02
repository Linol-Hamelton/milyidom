import type { Request, Response } from 'express';
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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST, Role.ADMIN)
  getHostEarnings(
    @CurrentUser() user: CurrentUserType,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.paymentsService.getHostEarnings(user.id, period);
  }

  @Get('host/transactions/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST, Role.ADMIN)
  async exportTransactionsCsv(
    @CurrentUser() user: CurrentUserType,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
    @Res() res: Response,
  ) {
    const csv = await this.paymentsService.exportTransactionsCsv(
      user.id,
      period,
    );
    const filename = `transactions-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(csv);
  }

  // ── Stripe Connect ───────────────────────────────────────────────────────────

  @Post('connect/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HOST, Role.ADMIN)
  createConnectOnboardingLink(@CurrentUser() user: CurrentUserType) {
    return this.paymentsService.createConnectOnboardingLink(user.id);
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  getConnectStatus(@CurrentUser() user: CurrentUserType) {
    return this.paymentsService.getConnectStatus(user.id);
  }
}
