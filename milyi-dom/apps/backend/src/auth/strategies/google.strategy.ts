import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback, type Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('oauth.google.clientId', ''),
      clientSecret: config.get<string>('oauth.google.clientSecret', ''),
      callbackURL: config.get<string>(
        'oauth.google.callbackUrl',
        'http://localhost:4001/api/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName ?? profile.displayName ?? 'User';
    const lastName = profile.name?.familyName ?? '';
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      return done(new Error('Google account has no email'), undefined);
    }

    const result = await this.authService.findOrCreateOAuthUser({
      provider: 'google',
      providerId: profile.id,
      email,
      firstName,
      lastName,
      avatarUrl,
    });

    done(null, result);
  }
}
