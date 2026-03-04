import { Role } from '@prisma/client';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { BookingsController } from './bookings.controller';
import type { BookingsService } from './bookings.service';

describe('BookingsController RBAC', () => {
  const controller = new BookingsController({} as BookingsService);

  const rolesFor = (method: keyof BookingsController) =>
    Reflect.getMetadata(ROLES_KEY, controller[method]) as Role[] | undefined;

  it('allows HOST and ADMIN for host bookings endpoint', () => {
    expect(rolesFor('hostBookings')).toEqual([Role.HOST, Role.ADMIN]);
  });

  it('allows HOST and ADMIN for booking status updates', () => {
    expect(rolesFor('updateStatus')).toEqual([Role.HOST, Role.ADMIN]);
  });
});
