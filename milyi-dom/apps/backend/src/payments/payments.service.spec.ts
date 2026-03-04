import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService.getPaymentStatus', () => {
  const createService = () => {
    const prisma = {
      booking: {
        findUnique: jest.fn(),
      },
    } as any;

    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as any;

    return {
      prisma,
      service: new PaymentsService(prisma, config),
    };
  };

  it('allows ADMIN to read payment status for unrelated booking', async () => {
    const { prisma, service } = createService();
    const payment = { id: 'payment-1', status: 'PENDING' };
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      guestId: 'guest-1',
      listing: { hostId: 'host-1' },
      payment,
    });

    await expect(service.getPaymentStatus('booking-1', 'admin-1', Role.ADMIN)).resolves.toBe(payment);
  });

  it('forbids unrelated non-admin users', async () => {
    const { prisma, service } = createService();
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      guestId: 'guest-1',
      listing: { hostId: 'host-1' },
      payment: { id: 'payment-1' },
    });

    await expect(
      service.getPaymentStatus('booking-1', 'outsider-1', Role.GUEST),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFound for unknown booking', async () => {
    const { prisma, service } = createService();
    prisma.booking.findUnique.mockResolvedValue(null);

    await expect(
      service.getPaymentStatus('missing-booking', 'admin-1', Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
