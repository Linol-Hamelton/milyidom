import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — allows unauthenticated requests through (sets req.user = null).
 * Use on endpoints that are public but can return personalized data when authenticated.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // Override handleRequest so that missing/invalid tokens return null instead of 401
  override handleRequest<T>(_err: unknown, user: T): T {
    return user ?? (null as T);
  }
}
