import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hash, compare } from 'bcrypt';
import type { CurrentUser } from './types/current-user.type.js';
import type { JwtPayload } from './types/jwt-payload.type';

type PrismaUserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

export type AuthResult = {
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailQueueService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const { email, password, firstName, lastName, phone } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException(
          'Пользователь с таким номером телефона уже зарегистрирован',
        );
      }
    }

    const hashedPassword = await hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        phone,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const safeUser = this.sanitizeUser(user);
    const tokens = await this.generateTokens(safeUser);

    // Send welcome email (fire-and-forget — never block registration)
    void this.emailService.sendWelcome(email, firstName);
    // Send email verification link
    void this.sendVerificationEmail(user.id, email);

    return {
      user: safeUser,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResult> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const safeUser = this.sanitizeUser(user);
    const tokens = await this.generateTokens(safeUser);

    return {
      user: safeUser,
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      const refreshSecret = this.configService.get<string>(
        'jwt.refreshSecret',
        process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
      );
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      const safeUser = this.sanitizeUser(user);
      const tokens = await this.generateTokens(safeUser);

      return {
        user: safeUser,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Сессия истекла. Пожалуйста, войдите снова.');
    }
  }

  async validateUser(payload: JwtPayload): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.blockedAt) {
      throw new UnauthorizedException('Ваш аккаунт заблокирован. Обратитесь в поддержку.');
    }

    return this.sanitizeUser(user);
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'email_verify' },
      {
        expiresIn: '24h',
        secret: this.configService.get<string>(
          'jwt.secret',
          process.env.JWT_SECRET ?? 'change-me',
        ),
      },
    );
    void this.emailService.sendEmailVerification(email, token);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify<{ sub: string; type?: string }>(
        token,
        {
          secret: this.configService.get<string>(
            'jwt.secret',
            process.env.JWT_SECRET ?? 'change-me',
          ),
        },
      );

      if (payload.type !== 'email_verify') {
        throw new BadRequestException('Недействительный токен подтверждения');
      }

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { isVerified: true },
      });

      return { message: 'Email успешно подтверждён' };
    } catch {
      throw new BadRequestException('Ссылка недействительна или её срок истёк');
    }
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Always return the same message to prevent email enumeration
      return { message: 'Если такой email зарегистрирован, ссылка для сброса пароля отправлена на него' };
    }

    const token = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      {
        expiresIn: '1h',
        secret: this.configService.get<string>('jwt.secret')!,
      },
    );

    // Send the reset link via email (fire-and-forget)
    void this.emailService.sendPasswordReset(email, token);

    return { message: 'Если такой email зарегистрирован, ссылка для сброса пароля отправлена на него' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; type?: string; iat?: number }>(
        token,
        {
          secret: this.configService.get<string>('jwt.secret')!,
        },
      );

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Недействительный токен сброса пароля');
      }

      // Single-use enforcement: reject token if password was already reset after it was issued
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { passwordChangedAt: true },
      });
      if (user?.passwordChangedAt && payload.iat) {
        const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (payload.iat < changedAtSec) {
          throw new BadRequestException('Ссылка для сброса пароля недействительна или истекла');
        }
      }

      const hashedPassword = await hash(newPassword, 12);

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      });

      return { message: 'Пароль успешно изменён' };
    } catch {
      throw new BadRequestException('Ссылка для сброса пароля недействительна или истекла');
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isCurrentPasswordValid = await compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Текущий пароль указан неверно');
    }

    const hashedPassword = await hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    return { message: 'Пароль успешно изменён' };
  }

  /**
   * Find or create a user via OAuth (Google, VK).
   * Returns tokens ready for the frontend redirect.
   */
  async findOrCreateOAuthUser(opts: {
    provider: 'google' | 'vk';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<AuthResult> {
    const providerField = opts.provider === 'google' ? 'googleId' : 'vkId';

    // Try to find by provider ID first, then by email
    let user = await this.prisma.user.findFirst({
      where: { [providerField]: opts.providerId },
      include: { profile: true },
    });

    if (!user) {
      // Check if email already exists (link provider to existing account)
      const existing = await this.prisma.user.findUnique({
        where: { email: opts.email },
        include: { profile: true },
      });

      if (existing) {
        // Link OAuth provider to existing account
        user = await this.prisma.user.update({
          where: { id: existing.id },
          data: { [providerField]: opts.providerId, isVerified: true },
          include: { profile: true },
        });
      } else {
        // Create new OAuth user (no password)
        user = await this.prisma.user.create({
          data: {
            email: opts.email,
            password: '', // OAuth-only account — password field left empty
            isVerified: true,
            [providerField]: opts.providerId,
            profile: {
              create: {
                firstName: opts.firstName,
                lastName: opts.lastName,
                avatarUrl: opts.avatarUrl,
              },
            },
          },
          include: { profile: true },
        });

        // Send welcome email for new OAuth users
        void this.emailService.sendWelcome(opts.email, opts.firstName);
      }
    }

    const safeUser = this.sanitizeUser(user);
    const tokens = await this.generateTokens(safeUser);

    return { user: safeUser, ...tokens };
  }

  private sanitizeUser(user: PrismaUserWithProfile): CurrentUser {
    const { password, ...safeUser } = user;
    void password;
    return safeUser;
  }

  private async generateTokens(user: CurrentUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>(
      'jwt.secret',
      process.env.JWT_SECRET ?? 'change-me',
    );
    const accessExpiresIn = this.configService.get<string>(
      'jwt.expiresIn',
      '15m',
    );
    const refreshSecret = this.configService.get<string>(
      'jwt.refreshSecret',
      process.env.JWT_REFRESH_SECRET ?? accessSecret,
    );
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '7d',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: accessExpiresIn,
        secret: accessSecret,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: refreshExpiresIn,
        secret: refreshSecret,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
