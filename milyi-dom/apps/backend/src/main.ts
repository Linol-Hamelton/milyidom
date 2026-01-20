import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import express, {
  type Application,
  type Request,
  type Response,
} from 'express';
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

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://10.139.67.45:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  const httpAdapter = app.getHttpAdapter();
  const maybeExpress: unknown = httpAdapter.getInstance();
  assertExpressApplication(maybeExpress);
  const expressApp = maybeExpress;

  expressApp.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

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
