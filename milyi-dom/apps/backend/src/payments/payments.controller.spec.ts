import { Role } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import type { PaymentsService } from './payments.service';
import type { CurrentUser } from '../auth/types/current-user.type.js';

describe('PaymentsController', () => {
  it('forwards user role to getPaymentStatus service call', async () => {
    const getPaymentStatusMock = jest.fn().mockResolvedValue({ id: 'payment-1' });
    const controller = new PaymentsController({
      getPaymentStatus: getPaymentStatusMock,
    } as unknown as PaymentsService);

    const user = {
      id: 'admin-1',
      role: Role.ADMIN,
    } as unknown as CurrentUser;

    await controller.getPaymentStatus('booking-1', user);

    expect(getPaymentStatusMock).toHaveBeenCalledWith('booking-1', 'admin-1', Role.ADMIN);
  });
});
