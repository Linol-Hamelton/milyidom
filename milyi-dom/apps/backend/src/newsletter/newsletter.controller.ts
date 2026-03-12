import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, MaxLength } from 'class-validator';
import { NewsletterService } from './newsletter.service';

class SubscribeDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  @MaxLength(254)
  email!: string;
}

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // 3 subscription attempts per hour per IP — prevents subscribe spam
  @Throttle({ global: { ttl: 3_600_000, limit: 3 } })
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email);
  }
}
