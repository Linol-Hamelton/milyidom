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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hash, compare } from 'bcrypt';
import type { CurrentUser } from './types/current-user.type.js';
import type { JwtPayload } from './types/jwt-payload.type';

type PrismaUserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

type AuthResult = {
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
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResult> {
    const { email, password, firstName, lastName, phone } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException(
          'User with this phone number already exists',
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
        throw new UnauthorizedException('User not found');
      }

      const safeUser = this.sanitizeUser(user);
      const tokens = await this.generateTokens(safeUser);

      return {
        user: safeUser,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
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

    return this.sanitizeUser(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    void this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      {
        expiresIn: '1h',
        secret: this.configService.get<string>(
          'jwt.secret',
          process.env.JWT_SECRET ?? 'change-me',
        ),
      },
    );

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
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

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid token');
      }

      const hashedPassword = await hash(newPassword, 12);

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });

      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired token');
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
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
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
