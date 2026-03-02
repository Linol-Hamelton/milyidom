import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

const APP_NAME = 'Милый Дом';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Setup ─────────────────────────────────────────────────────────────────

  /**
   * Generates a new TOTP secret for the user and returns a QR code data URL.
   * The secret is stored immediately; the user must call enable2FA to activate it.
   */
  async generateSetup(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Двухфакторная аутентификация уже включена');
    }

    const secret = generateSecret();
    const otpAuthUrl = generateURI({ issuer: APP_NAME, label: user.email, secret });
    const qrCode = await toDataURL(otpAuthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, qrCode };
  }

  /**
   * Verifies the TOTP token and permanently enables 2FA for the user.
   */
  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Сначала инициируйте настройку 2FA через /auth/2fa/setup');
    }

    const result = verifySync({ token, secret: user.twoFactorSecret });
    if (!result.valid) {
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  /**
   * Disables 2FA after confirming the current token.
   */
  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Двухфакторная аутентификация не включена');
    }

    const result = verifySync({ token, secret: user.twoFactorSecret });
    if (!result.valid) {
      throw new UnauthorizedException('Неверный код подтверждения');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  // ── Verification ──────────────────────────────────────────────────────────

  /**
   * Verifies a TOTP token. Call this during the login flow.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) return false;

    return verifySync({ token, secret: user.twoFactorSecret }).valid;
  }

  /**
   * Returns whether 2FA is enabled for the given user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled ?? false;
  }
}
