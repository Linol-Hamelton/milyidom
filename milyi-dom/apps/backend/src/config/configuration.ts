import { isAbsolute, join } from 'path';

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  // In production, JWT secrets MUST be set explicitly — no insecure fallbacks
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (isProd && !jwtSecret) {
    throw new Error('JWT_SECRET env variable is required in production');
  }
  if (isProd && !jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET env variable is required in production');
  }

  return {
    nodeEnv,
    port: parseInt(process.env.PORT || '4001', 10),
    app: {
      apiUrl: process.env.API_URL || 'https://api.milyidom.com',
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      secret: jwtSecret || 'dev-jwt-secret-change-in-production-min-32-chars!!',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshSecret:
        jwtRefreshSecret ||
        'dev-refresh-secret-change-in-production-min-32-chars!!',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    allowedOrigins: process.env.ALLOWED_ORIGINS || '',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID,
    },
    yookassa: {
      shopId: process.env.YOOKASSA_SHOP_ID ?? '',
      secretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
      payoutToken: process.env.YOOKASSA_PAYOUT_TOKEN ?? '',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || 'not-configured',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4001/api/auth/google/callback',
      },
      vk: {
        clientId: process.env.VK_CLIENT_ID || 'not-configured',
        clientSecret: process.env.VK_CLIENT_SECRET || 'not-configured',
        callbackUrl: process.env.VK_CALLBACK_URL || 'http://localhost:4001/api/auth/vk/callback',
      },
    },
    typesense: {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
      apiKey: process.env.TYPESENSE_API_KEY || 'milyi-dom-typesense-dev-key',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    storage: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'ru-central1',
      endpoint: process.env.S3_ENDPOINT || '',       // Yandex: https://storage.yandexcloud.net
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      cdnBase: process.env.CDN_BASE_URL || '',       // Yandex: https://<bucket>.storage.yandexcloud.net
    },
    images: {
      baseUrl: process.env.IMAGES_BASE_URL || 'http://localhost:4001/images',
      root: (() => {
        const configured = process.env.IMAGES_ROOT;
        if (configured) {
          return isAbsolute(configured)
            ? configured
            : join(process.cwd(), configured);
        }
        return join(process.cwd(), '..', '..', 'images');
      })(),
    },
  };
};
