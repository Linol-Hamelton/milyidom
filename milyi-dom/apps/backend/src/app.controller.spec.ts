import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  type AsyncMock<T> = jest.Mock<Promise<T>, []>;
  type PrismaMock = {
    user: { count: AsyncMock<number> };
    listing: {
      count: AsyncMock<number>;
      groupBy: AsyncMock<Array<{ city: string; _count: { city: number } }>>;
    };
    booking: { count: AsyncMock<number> };
    review: { count: AsyncMock<number> };
  };

  let appController: AppController;
  let prismaMock: PrismaMock;

  beforeEach(async () => {
    const listingCountMock: AsyncMock<number> = jest
      .fn<Promise<number>, []>()
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8);

    prismaMock = {
      user: { count: jest.fn<Promise<number>, []>().mockResolvedValue(25) },
      listing: {
        count: listingCountMock,
        groupBy: jest
          .fn<Promise<Array<{ city: string; _count: { city: number } }>>, []>()
          .mockResolvedValue([
            { city: 'Moscow', _count: { city: 6 } },
            { city: 'Saint Petersburg', _count: { city: 4 } },
          ]),
      },
      booking: { count: jest.fn<Promise<number>, []>().mockResolvedValue(18) },
      review: { count: jest.fn<Promise<number>, []>().mockResolvedValue(42) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  it('returns basic API info', () => {
    const result = appController.getRoot();
    expect(result.message).toBe('Milyi Dom API');
    expect(result.version).toBe('1.0.0');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns health status', () => {
    const result = appController.getHealth();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('reachable');
  });

  it('aggregates stats', async () => {
    const stats = await appController.getStats();
    expect(stats).toEqual({
      users: 25,
      listings: 12,
      activeListings: 8,
      bookings: 18,
      reviews: 42,
    });

    expect(prismaMock.user.count).toHaveBeenCalled();
    expect(prismaMock.listing.count).toHaveBeenCalledTimes(2);
  });

  it('returns popular cities', async () => {
    const cities = await appController.getPopularCities();
    expect(cities).toEqual([
      { name: 'Moscow', listingsCount: 6 },
      { name: 'Saint Petersburg', listingsCount: 4 },
    ]);

    expect(prismaMock.listing.groupBy).toHaveBeenCalled();
  });
});
