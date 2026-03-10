import { withSentryConfig } from '@sentry/nextjs';

// ── Security headers applied to every Next.js response ───────────────────────
const securityHeaders = [
  // Prevent clickjacking — only allow framing from same origin
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information sent on cross-origin requests
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Enforce HTTPS for 1 year (only effective over HTTPS — safe to set unconditionally)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Disable access to sensitive browser features not used by the app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
  },
  // Content-Security-Policy — generous allowances for Yandex Maps, YooKassa, Sentry
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: self + Yandex Maps CDN + YooKassa checkout + Sentry tunnel (via /monitoring)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yandex.st https://checkout.yookassa.ru",
      // Styles: self + inline (required by Tailwind CSS and Yandex Maps)
      "style-src 'self' 'unsafe-inline' https://yandex.st",
      // Fonts: self + Yandex static
      "font-src 'self' data: https://yandex.st",
      // Images: self + S3 + Unsplash (demo) + Yandex (map tiles/avatars) + data/blob URIs
      "img-src 'self' data: blob: https://storage.yandexcloud.net https://images.unsplash.com https://*.yandex.ru https://*.yandex.net https://*.maps.yandex.net",
      // API calls: backend + S3 + Yandex Maps API + Sentry
      "connect-src 'self' https://api.milyidom.com https://storage.yandexcloud.net https://*.yandex.ru https://*.yandex.net https://*.sentry.io",
      // Iframes: YooKassa payment page
      "frame-src 'self' https://checkout.yookassa.ru",
      // Workers (Next.js service worker)
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "images.milyi-dom.local",
      },
      {
        protocol: "https",
        hostname: "images.milyi-dom.local",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4001",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4001",
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project (set these when you have a real DSN)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI / production builds
  silent: !process.env.CI,

  // Upload source maps to Sentry for better stack traces in production.
  // Requires SENTRY_AUTH_TOKEN env variable.
  widenClientFileUpload: true,
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Automatically annotate React components with their displayName
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: '/monitoring',
});
