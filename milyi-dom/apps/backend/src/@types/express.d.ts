import type { CurrentUser } from '../auth/types/current-user.type.js';

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

export {};
