import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Patch,
  Redirect,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuditAction } from '@prisma/client';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { VkAuthGuard } from './guards/vk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Audit, AuditInterceptor } from '../audit/audit.interceptor';
import type { CurrentUser as CurrentUserType } from './types/current-user.type.js';
import type { AuthResult } from './auth.service';

@Controller('auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly config: ConfigService,
  ) {}

  // 10 registration attempts per minute per IP — prevents bot signups
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  @Audit(AuditAction.USER_REGISTER)
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 5 login attempts per minute per IP — brute-force protection
  @Throttle({ global: { ttl: 60_000, limit: 5 } })
  @Audit(AuditAction.USER_LOGIN)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 5 refresh attempts per minute
  @Throttle({ global: { ttl: 60_000, limit: 5 } })
  @Audit(AuditAction.TOKEN_REFRESH)
  @Post('refresh')
  refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  // Email verification
  @Post('verify-email')
  verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // Resend verification — JWT protected so only authenticated users can call
  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  resendVerification(@CurrentUser() user: CurrentUserType) {
    return this.authService.sendVerificationEmail(user.id, user.email);
  }

  // 3 password reset requests per hour
  @Throttle({ global: { ttl: 3_600_000, limit: 3 } })
  @Audit(AuditAction.PASSWORD_RESET_REQUEST)
  @Post('forgot-password')
  requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Audit(AuditAction.PASSWORD_RESET_COMPLETE)
  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Audit(AuditAction.PASSWORD_CHANGE)
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: CurrentUserType,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(
      user.id,
      currentPassword,
      newPassword,
    );
  }

  // ── 2FA (TOTP) ───────────────────────────────────────────────────────────────

  // Returns QR code data URL + raw secret for authenticator app setup
  @Get('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2FA(@CurrentUser() user: CurrentUserType) {
    return this.twoFactorService.generateSetup(user.id);
  }

  // Verifies first code and permanently enables 2FA
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  enable2FA(
    @CurrentUser() user: CurrentUserType,
    @Body('token') token: string,
  ) {
    return this.twoFactorService.enable2FA(user.id, token);
  }

  // Disables 2FA after confirming the current token
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  disable2FA(
    @CurrentUser() user: CurrentUserType,
    @Body('token') token: string,
  ) {
    return this.twoFactorService.disable2FA(user.id, token);
  }

  // Called from the login flow when 2FA is required
  @Throttle({ global: { ttl: 60_000, limit: 10 } })
  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  verify2FA(
    @CurrentUser() user: CurrentUserType,
    @Body('token') token: string,
  ) {
    return this.twoFactorService.verifyToken(user.id, token);
  }

  // ── OAuth: Google ────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  googleCallback(@Req() req: Request) {
    return this.buildOAuthRedirect(req.user as AuthResult);
  }

  // ── OAuth: VK ────────────────────────────────────────────────────────────────

  @Get('vk')
  @UseGuards(VkAuthGuard)
  vkLogin() {
    // Passport redirects to VK
  }

  @Get('vk/callback')
  @UseGuards(VkAuthGuard)
  @Redirect()
  vkCallback(@Req() req: Request) {
    return this.buildOAuthRedirect(req.user as AuthResult);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildOAuthRedirect(result: AuthResult) {
    const frontendUrl = this.config.get<string>('frontend.url', 'http://localhost:3000');
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return { url: `${frontendUrl}/auth/oauth-callback?${params.toString()}` };
  }
}
