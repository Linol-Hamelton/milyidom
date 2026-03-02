import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { AuditAction } from '@prisma/client';
import type { CurrentUser } from '../auth/types/current-user.type';
import { AuditService } from './audit.service';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * Decorator to mark a controller method for audit logging.
 *
 * @example
 * @Audit(AuditAction.USER_LOGIN)
 * @Post('login')
 * login() {}
 */
export function Audit(
  action: AuditAction,
  resourceType?: string,
): MethodDecorator {
  return (target, key, descriptor) => {
    Reflect.defineMetadata(AUDIT_ACTION_KEY, action, descriptor.value as object);
    if (resourceType) {
      Reflect.defineMetadata(AUDIT_RESOURCE_KEY, resourceType, descriptor.value as object);
    }
    return descriptor;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<AuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Only intercept methods decorated with @Audit()
    if (!action) {
      return next.handle();
    }

    const resourceType = this.reflector.get<string>(
      AUDIT_RESOURCE_KEY,
      context.getHandler(),
    );

    const req = context.switchToHttp().getRequest<Request & { user?: CurrentUser }>();
    const user = req.user;
    const ipAddress = this.extractIp(req);
    const userAgent = req.headers['user-agent']?.slice(0, 255);

    const baseEntry = {
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      action,
      resourceType,
      ipAddress,
      userAgent,
    };

    return next.handle().pipe(
      tap((result) => {
        // Extract resource ID from result if possible
        const resourceId =
          typeof result === 'object' && result !== null && 'id' in result
            ? String((result as { id: unknown }).id)
            : undefined;

        void this.auditService.log({
          ...baseEntry,
          resourceId,
          success: true,
        });
      }),
      catchError((err: unknown) => {
        void this.auditService.log({
          ...baseEntry,
          success: false,
          errorMessage:
            err instanceof Error ? err.message : String(err),
        });
        return throwError(() => err);
      }),
    );
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress ?? 'unknown';
  }
}
