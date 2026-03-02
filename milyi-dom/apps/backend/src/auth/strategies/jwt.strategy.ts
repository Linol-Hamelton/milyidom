/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import type { JwtPayload } from '../types/jwt-payload.type';
import type { CurrentUser } from '../types/current-user.type.js';

interface RequestLike {
  headers?: {
    authorization?: unknown;
  };
}

const extractBearerToken = (
  request: RequestLike | undefined,
): string | null => {
  if (!request) {
    return null;
  }

  const authorization =
    request.headers && typeof request.headers === 'object'
      ? (request.headers as { authorization?: unknown }).authorization
      : undefined;

  if (!authorization) {
    return null;
  }

  let header: string | null = null;

  if (Array.isArray(authorization)) {
    const list = authorization as unknown[];
    const [first] = list;
    if (typeof first === 'string') {
      header = first;
    }
  } else if (typeof authorization === 'string') {
    header = authorization;
  }

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const jwtFromRequest = (value: unknown): string | null =>
  extractBearerToken(value as RequestLike | undefined);

const resolveConfigString = (
  service: ConfigService,
  key: string,
  fallback: string,
): string => {
  const value = service.get<string | undefined>(key);
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser> {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
