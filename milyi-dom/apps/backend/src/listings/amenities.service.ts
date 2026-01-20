import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AmenitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.amenity.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findByCategory(category: string) {
    return this.prisma.amenity.findMany({
      where: {
        category: {
          equals: category,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findCategories() {
    const amenities = await this.prisma.amenity.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    return amenities.map((amenity) => amenity.category);
  }

  async getAmenitiesWithCounts() {
    return this.prisma.amenity.findMany({
      include: {
        _count: {
          select: {
            listings: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
