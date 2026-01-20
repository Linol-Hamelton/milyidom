import type { Profile, User } from '@prisma/client';

export type CurrentUser = Omit<User, 'password'> & {
  profile?: Profile | null;
};
