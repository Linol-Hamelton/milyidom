import { isAbsolute, join } from 'path';

export default () => ({
  port: parseInt(process.env.PORT || '4001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'your-super-secret-refresh-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
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
});
