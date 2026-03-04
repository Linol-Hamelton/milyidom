// Sentry must be initialized before any other imports
import './instrument';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';
import express, {
  type Application,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

function assertExpressApplication(
  instance: unknown,
): asserts instance is Application {
  if (
    typeof instance !== 'function' &&
    (typeof instance !== 'object' || instance === null)
  ) {
    throw new Error('Expected Express application instance');
  }

  const candidate = instance as Partial<Application>;
  if (
    typeof candidate.use !== 'function' ||
    typeof candidate.get !== 'function'
  ) {
    throw new Error('HTTP adapter is not an Express application');
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // ── Security headers (helmet) ───────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // required for Stripe.js iframes
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://js.stripe.com'],
          frameSrc: ["'self'", 'https://js.stripe.com'],
          connectSrc: ["'self'", 'https://api.stripe.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // ── Global prefix & pipes ───────────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new MetricsInterceptor(app.get(MetricsService)),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const rawOrigins = config.get<string>('ALLOWED_ORIGINS', '');
  const allowedOrigins: string[] = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key'],
  });

  // ── Raw body for Stripe webhook ─────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  const maybeExpress: unknown = httpAdapter.getInstance();
  assertExpressApplication(maybeExpress);
  const expressApp = maybeExpress;

  expressApp.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

  // ── Static files ────────────────────────────────────────────────────────────
  const projectRoot = process.cwd();
  const imagesPath = join(projectRoot, '..', '..', 'images');
  expressApp.use('/images', express.static(imagesPath));

  const uploadsPath = join(projectRoot, 'uploads');
  expressApp.use('/uploads', express.static(uploadsPath));

  expressApp.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Milyi Dom API',
      status: 'ok',
      endpoints: {
        api: '/api',
        health: '/api/health',
        stats: '/api/stats',
        images:
          '/images/{country}/{city}/{street}/{house}/{listingId}/{fileName}',
        uploads: '/uploads/{filename}',
      },
      timestamp: new Date().toISOString(),
    });
  });

  const port = config.get<number>('PORT', 4001);
  await app.listen(port);
}

void bootstrap();
