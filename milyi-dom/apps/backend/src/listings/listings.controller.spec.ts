import { ListingsController } from './listings.controller';
import type { ListingsService } from './listings.service';
import type { CreateListingDto } from './dto/create-listing.dto';

describe('ListingsController', () => {
  it('forwards Idempotency-Key header to listings service on create', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 'listing-1' });
    const controller = new ListingsController({
      create: createMock,
    } as unknown as ListingsService);

    const user = { id: 'host-1' } as { id: string };
    const dto = { title: 'Тестовое объявление' } as unknown as CreateListingDto;
    const idempotencyKey = 'abc-123';

    await controller.create(user, dto, idempotencyKey);

    expect(createMock).toHaveBeenCalledWith(user.id, dto, idempotencyKey);
  });
});
