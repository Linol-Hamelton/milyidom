import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-vkontakte';
import { AuthService } from '../auth.service';

interface VkProfile {
  id: string;
  displayName: string;
  name?: { givenName?: string; familyName?: string };
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

type DoneCallback = (err: Error | null, user?: unknown) => void;

@Injectable()
export class VkStrategy extends PassportStrategy(Strategy, 'vk') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('oauth.vk.clientId', ''),
      clientSecret: config.get<string>('oauth.vk.clientSecret', ''),
      callbackURL: config.get<string>(
        'oauth.vk.callbackUrl',
        'http://localhost:4001/api/auth/vk/callback',
      ),
      profileFields: ['id', 'email', 'first_name', 'last_name', 'photo_200'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string | undefined,
    _params: { email?: string },
    profile: VkProfile,
    done: DoneCallback,
  ) {
    const email = _params.email ?? profile.emails?.[0]?.value;
    const firstName = profile.name?.givenName ?? profile.displayName ?? 'User';
    const lastName = profile.name?.familyName ?? '';
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      // VK doesn't always provide email — create a placeholder
      const placeholderEmail = `vk_${profile.id}@milyi-dom.noemail`;
      const result = await this.authService.findOrCreateOAuthUser({
        provider: 'vk',
        providerId: profile.id,
        email: placeholderEmail,
        firstName,
        lastName,
        avatarUrl,
      });
      return done(null, result);
    }

    const result = await this.authService.findOrCreateOAuthUser({
      provider: 'vk',
      providerId: profile.id,
      email,
      firstName,
      lastName,
      avatarUrl,
    });

    done(null, result);
  }
}
