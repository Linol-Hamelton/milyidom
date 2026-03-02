import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser as CurrentUserType } from '../../auth/types/current-user.type.js';

export const CurrentUser = createParamDecorator<undefined, CurrentUserType>(
  (_data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    return user as CurrentUserType;
  },
);
