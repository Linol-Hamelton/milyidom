import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res.statusCode, start),
        error: () => this.record(req, res.statusCode || 500, start),
      }),
    );
  }

  private record(req: Request, statusCode: number, startMs: number) {
    const duration = (Date.now() - startMs) / 1000;
    // Normalize route: use Express route pattern if available, else path
    const route =
      (req.route as { path?: string } | undefined)?.path ?? req.path ?? 'unknown';

    this.metrics.httpRequestDuration.observe(
      { method: req.method, route, status_code: String(statusCode) },
      duration,
    );
  }
}
