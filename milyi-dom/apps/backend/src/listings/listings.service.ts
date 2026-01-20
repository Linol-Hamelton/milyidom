import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, ListingStatus, Prisma } from '@prisma/client';
import type { Express } from 'express';
import { promises as fs } from 'fs';
import { extname, join, posix } from 'path';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

const BASE_INCLUDE = {
  images: {
    orderBy: { position: Prisma.SortOrder.asc },
  },
  amenities: {
    include: {
      amenity: true,
    },
  },
  host: {
    select: {
      id: true,
      email: true,
      profile: true,
    },
  },
} satisfies Prisma.ListingInclude;

const DEFAULT_LIMIT = 20;

type ListingWithRelations = Prisma.ListingGetPayload<{
  include: typeof BASE_INCLUDE;
}>;

type ListingImageWithUrl = Omit<
  ListingWithRelations['images'][number],
  'url'
> & {
  url: string | null;
};

export type ListingSummary = Omit<
  ListingWithRelations,
  | 'bathrooms'
  | 'basePrice'
  | 'cleaningFee'
  | 'serviceFee'
  | 'latitude'
  | 'longitude'
  | 'images'
> & {
  bathrooms: number;
  basePrice: number;
  cleaningFee: number | null;
  serviceFee: number | null;
  latitude: number;
  longitude: number;
  images: ListingImageWithUrl[];
  distance?: number | null;
};

@Injectable()
export class ListingsService {
  private readonly imageBaseUrl: string;
  private readonly imageRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const configuredUrl = this.configService.get<string>('images.baseUrl');
    this.imageBaseUrl = (
      configuredUrl || 'http://localhost:4001/images'
    ).replace(/\/$/, '');
    this.imageRoot =
      this.configService.get<string>('images.root') ??
      join(process.cwd(), '..', '..', 'images');
  }

  private toNumber(value: Prisma.Decimal | number): number {
    return value instanceof Prisma.Decimal ? value.toNumber() : value;
  }

  private toNullableNumber(
    value: Prisma.Decimal | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return this.toNumber(value);
  }

  private normalizeImageUrl(url?: string | null): string | null {
    if (!url) {
      return url ?? null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const normalizedBase = this.imageBaseUrl.endsWith('/')
      ? this.imageBaseUrl
      : `${this.imageBaseUrl}/`;

    try {
      return new URL(url.replace(/^\/+/, ''), normalizedBase).toString();
    } catch {
      return `${normalizedBase}${url.replace(/^\/+/, '')}`;
    }
  }

  private serializeListing(listing: ListingWithRelations): ListingSummary {
    const {
      bathrooms,
      basePrice,
      cleaningFee,
      serviceFee,
      latitude,
      longitude,
      images,
      ...rest
    } = listing;

    const normalizedImages: ListingImageWithUrl[] = images.map((image) => ({
      ...image,
      url: this.normalizeImageUrl(image.url),
    }));

    return {
      ...rest,
      bathrooms: this.toNumber(bathrooms),
      basePrice: this.toNumber(basePrice),
      cleaningFee: this.toNullableNumber(cleaningFee),
      serviceFee: this.toNullableNumber(serviceFee),
      latitude: this.toNumber(latitude),
      longitude: this.toNumber(longitude),
      images: normalizedImages,
    };
  }

  private serializeListings(
    listings: ListingWithRelations[],
  ): ListingSummary[] {
    return listings.map((listing) => this.serializeListing(listing));
  }

  async create(hostId: string, dto: CreateListingDto) {
    const slug = await this.generateSlug(dto.title);

    const listing = await this.prisma.listing.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        summary: dto.summary,
        propertyType: dto.propertyType,
        hostId,
        guests: dto.guests,
        bedrooms: dto.bedrooms,
        beds: dto.beds,
        bathrooms: new Prisma.Decimal(dto.bathrooms),
        basePrice: new Prisma.Decimal(dto.basePrice),
        cleaningFee:
          dto.cleaningFee !== undefined
            ? new Prisma.Decimal(dto.cleaningFee)
            : undefined,
        serviceFee:
          dto.serviceFee !== undefined
            ? new Prisma.Decimal(dto.serviceFee)
            : undefined,
        instantBook: dto.instantBook ?? false,
        checkInFrom: dto.checkInFrom,
        checkOutUntil: dto.checkOutUntil,
        minNights: dto.minNights,
        maxNights: dto.maxNights,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        amenities: dto.amenityIds
          ? {
              create: dto.amenityIds.map((amenityId) => ({ amenityId })),
            }
          : undefined,
        images: {
          create: dto.images.map((image, index) => ({
            url: image.url,
            description: image.description,
            position: image.position ?? index,
            isPrimary: image.isPrimary ?? index === 0,
          })),
        },
      },
      include: BASE_INCLUDE,
    });

    await this.updateLocation(listing.id, dto.longitude, dto.latitude);

    return this.serializeListing(listing);
  }

  async update(listingId: string, hostId: string, dto: UpdateListingDto) {
    await this.ensureHostOwnership(listingId, hostId);

    const data: Prisma.ListingUpdateInput = {
      title: dto.title,
      description: dto.description,
      summary: dto.summary,
      propertyType: dto.propertyType,
      guests: dto.guests,
      bedrooms: dto.bedrooms,
      beds: dto.beds,
      instantBook: dto.instantBook,
      checkInFrom: dto.checkInFrom,
      checkOutUntil: dto.checkOutUntil,
      minNights: dto.minNights,
      maxNights: dto.maxNights,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
    };

    if (dto.bathrooms !== undefined) {
      data.bathrooms = new Prisma.Decimal(dto.bathrooms);
    }
    if (dto.basePrice !== undefined) {
      data.basePrice = new Prisma.Decimal(dto.basePrice);
    }
    if (dto.cleaningFee !== undefined) {
      data.cleaningFee = new Prisma.Decimal(dto.cleaningFee);
    }
    if (dto.serviceFee !== undefined) {
      data.serviceFee = new Prisma.Decimal(dto.serviceFee);
    }

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      data.latitude = new Prisma.Decimal(dto.latitude);
      data.longitude = new Prisma.Decimal(dto.longitude);
    }

    if (dto.amenityIds) {
      await this.prisma.listingAmenity.deleteMany({ where: { listingId } });
      data.amenities = {
        create: dto.amenityIds.map((amenityId) => ({ amenityId })),
      };
    }

    if (dto.images) {
      await this.prisma.propertyImage.deleteMany({ where: { listingId } });
      data.images = {
        create: dto.images.map((image, index) => ({
          url: image.url,
          description: image.description,
          position: image.position ?? index,
          isPrimary: image.isPrimary ?? index === 0,
        })),
      };
    }

    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data,
      include: BASE_INCLUDE,
    });

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.updateLocation(listingId, dto.longitude, dto.latitude);
    }

    return this.serializeListing(listing);
  }

  async findAll() {
    const listings = await this.prisma.listing.findMany({
      where: { status: ListingStatus.PUBLISHED },
      include: BASE_INCLUDE,
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });

    return this.serializeListings(listings);
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: BASE_INCLUDE,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.serializeListing(listing);
  }

  async findBySlug(slug: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { slug },
      include: BASE_INCLUDE,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.serializeListing(listing);
  }

  async getFeaturedListings(limit = 8) {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        featured: true,
      },
      include: BASE_INCLUDE,
      orderBy: [
        { rating: Prisma.SortOrder.desc },
        { reviewCount: Prisma.SortOrder.desc },
      ],
      take: limit,
    });

    return this.serializeListings(listings);
  }

  async getHostListings(
    hostId: string,
    pagination: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<ListingSummary>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where: { hostId },
        include: BASE_INCLUDE,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take: limit,
      }),
      this.prisma.listing.count({ where: { hostId } }),
    ]);

    const serialized = this.serializeListings(items);

    return {
      items: serialized,
      meta: { page, limit, total },
    } satisfies PaginatedResult<ListingSummary>;
  }

  async addListingImageFromUpload(
    listingId: string,
    hostId: string,
    file: Express.Multer.File | undefined,
    options: {
      description?: string;
      isPrimary?: boolean;
      position?: number;
    } = {},
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    await this.ensureHostOwnership(listingId, hostId);

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        country: true,
        city: true,
        addressLine1: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const segments = this.buildImagePathSegments(listing);
    const targetDir = join(this.imageRoot, ...segments);
    await fs.mkdir(targetDir, { recursive: true });

    const extension = (
      extname(file.originalname || '') || '.jpg'
    ).toLowerCase();
    const baseName = this.sanitizeFileName(
      file.originalname?.replace(extname(file.originalname || ''), '') ||
        'image',
    );
    const uniqueName = `${baseName || 'image'}-${Date.now()}${extension}`;
    const destination = join(targetDir, uniqueName);
    await fs.writeFile(destination, file.buffer);

    const relativePath = posix.join(...segments, uniqueName);

    if (options.isPrimary) {
      await this.prisma.propertyImage.updateMany({
        where: { listingId },
        data: { isPrimary: false },
      });
    }

    const position =
      options.position !== undefined
        ? options.position
        : await this.getNextImagePosition(listingId);

    const imageRecord = await this.prisma.propertyImage.create({
      data: {
        listingId,
        url: relativePath,
        description: options.description,
        position,
        isPrimary: options.isPrimary ?? false,
      },
    });

    return {
      ...imageRecord,
      url: this.normalizeImageUrl(imageRecord.url),
    };
  }

  async getListingStats(listingId: string) {
    await this.ensureListingExists(listingId);
    return this.prisma.calculateListingStats(listingId);
  }

  async checkAvailability(listingId: string, dto: CheckAvailabilityDto) {
    await this.ensureListingExists(listingId);

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    // Date validation
    if (checkIn >= checkOut) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    if (checkIn < new Date()) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Check for conflicting bookings
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        listingId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        OR: [
          {
            // Existing booking starts during the selected period
            checkIn: {
              gte: checkIn,
              lt: checkOut,
            },
          },
          {
            // Existing booking ends during the selected period
            checkOut: {
              gt: checkIn,
              lte: checkOut,
            },
          },
          {
            // Existing booking completely overlaps the selected period
            AND: [
              { checkIn: { lte: checkIn } },
              { checkOut: { gte: checkOut } },
            ],
          },
        ],
      },
      select: {
        checkIn: true,
        checkOut: true,
      },
      orderBy: {
        checkIn: 'asc',
      },
    });

    return {
      available: conflictingBookings.length === 0,
      conflictingBookings:
        conflictingBookings.length > 0 ? conflictingBookings : undefined,
    };
  }

  async updateStatus(listingId: string, hostId: string, status: ListingStatus) {
    await this.ensureHostOwnership(listingId, hostId);

    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { status },
      include: BASE_INCLUDE,
    });

    return this.serializeListing(listing);
  }

  async remove(listingId: string, hostId: string) {
    await this.ensureHostOwnership(listingId, hostId);
    await this.prisma.propertyImage.deleteMany({ where: { listingId } });
    await this.prisma.listingAmenity.deleteMany({ where: { listingId } });
    const listing = await this.prisma.listing.delete({
      where: { id: listingId },
      include: BASE_INCLUDE,
    });
    return this.serializeListing(listing);
  }

  async searchListings(
    dto: SearchListingsDto,
  ): Promise<PaginatedResult<ListingSummary>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_LIMIT;
    const where = this.buildWhereFilters(dto);

    if (dto.lat !== undefined && dto.lng !== undefined) {
      return this.searchWithGeo(dto, where, page, limit);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: BASE_INCLUDE,
        orderBy: this.buildOrderBy(dto.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    const serialized = this.serializeListings(items);

    return {
      items: serialized,
      meta: { page, limit, total },
    } satisfies PaginatedResult<ListingSummary>;
  }

  private buildWhereFilters(dto: SearchListingsDto): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.PUBLISHED,
    };

    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' };
    }

    if (dto.country) {
      where.country = { equals: dto.country, mode: 'insensitive' };
    }

    if (dto.location) {
      where.OR = [
        { city: { contains: dto.location, mode: 'insensitive' } },
        { country: { contains: dto.location, mode: 'insensitive' } },
        { addressLine1: { contains: dto.location, mode: 'insensitive' } },
      ];
    }

    if (dto.propertyType) {
      where.propertyType = { equals: dto.propertyType, mode: 'insensitive' };
    }

    if (dto.guests) {
      where.guests = { gte: dto.guests };
    }

    if (dto.instantBook !== undefined) {
      where.instantBook = dto.instantBook;
    }

    if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
      where.basePrice = {};
      if (dto.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(dto.minPrice);
      }
      if (dto.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(dto.maxPrice);
      }
    }

    if (dto.minRating) {
      where.rating = { gte: dto.minRating };
    }

    if (dto.amenities?.length) {
      where.amenities = {
        some: {
          amenityId: { in: dto.amenities },
        },
      };
    }

    if (dto.checkIn && dto.checkOut) {
      where.NOT = {
        bookings: {
          some: {
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            AND: [
              { checkIn: { lt: new Date(dto.checkOut) } },
              { checkOut: { gt: new Date(dto.checkIn) } },
            ],
          },
        },
      };
    }

    return where;
  }

  private buildOrderBy(
    sort?: SearchListingsDto['sort'],
  ): Prisma.ListingOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_low':
        return [{ basePrice: Prisma.SortOrder.asc }];
      case 'price_high':
        return [{ basePrice: Prisma.SortOrder.desc }];
      case 'new':
        return [{ createdAt: Prisma.SortOrder.desc }];
      case 'rating':
      default:
        return [
          { rating: Prisma.SortOrder.desc },
          { reviewCount: Prisma.SortOrder.desc },
        ];
    }
  }

  private async searchWithGeo(
    dto: SearchListingsDto,
    where: Prisma.ListingWhereInput,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ListingSummary>> {
    const upperBound = Math.min(page * limit + limit, 200);
    const candidates = await this.prisma.listing.findMany({
      where,
      include: BASE_INCLUDE,
      take: upperBound,
    });

    const itemsWithDistance: ListingSummary[] = candidates.map((listing) => {
      const serialized = this.serializeListing(listing);
      return {
        ...serialized,
        distance: this.computeDistance(dto.lat!, dto.lng!, serialized),
      };
    });

    const sorted = itemsWithDistance.sort(
      (a, b) => (a.distance ?? 0) - (b.distance ?? 0),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const items = sorted.slice(start, start + limit);

    return {
      items,
      meta: { page, limit, total },
    } satisfies PaginatedResult<ListingSummary>;
  }

  private async getNextImagePosition(listingId: string) {
    const aggregation = await this.prisma.propertyImage.aggregate({
      where: { listingId },
      _max: { position: true },
    });

    return (aggregation._max.position ?? -1) + 1;
  }

  private computeDistance(
    lat: number,
    lng: number,
    listing: ListingSummary,
  ): number | null {
    const { latitude, longitude } = listing;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const lat1 = toRadians(lat);
    const lng1 = toRadians(lng);
    const lat2 = toRadians(latitude);
    const lng2 = toRadians(longitude);

    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(earthRadiusKm * c * 10) / 10;
  }

  private async ensureListingExists(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
  }

  private async ensureHostOwnership(listingId: string, hostId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, hostId: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.hostId !== hostId) {
      throw new UnauthorizedException();
    }
  }

  private async generateSlug(title: string, existingId?: string) {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const record = await this.prisma.listing.findUnique({ where: { slug } });
      if (!record || record.id === existingId) {
        return slug;
      }
      slug = `${baseSlug}-${counter++}`;
    }
  }

  private slugify(input: string) {
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  private sanitizePathSegment(value: string | null | undefined) {
    if (!value) {
      return 'unknown';
    }

    return (
      value
        .normalize('NFKD')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || 'unknown'
    );
  }

  private sanitizeFileName(value: string) {
    return this.slugify(value).replace(/^-+/, '').replace(/-+$/, '') || 'image';
  }

  private extractStreetAndHouse(addressLine1: string | null | undefined) {
    if (!addressLine1) {
      return { street: 'address', house: 'unknown' };
    }

    const trimmed = addressLine1.trim();
    const leadingMatch = trimmed.match(/^([0-9]+[\w-]*)\s+(.+)$/);
    if (leadingMatch) {
      return { house: leadingMatch[1], street: leadingMatch[2] };
    }

    const trailingMatch = trimmed.match(/^(.+?)\s+([0-9]+[\w-]*)$/);
    if (trailingMatch) {
      return { house: trailingMatch[2], street: trailingMatch[1] };
    }

    return { street: trimmed, house: 'unknown' };
  }

  private buildImagePathSegments(listing: {
    id: string;
    country: string | null;
    city: string | null;
    addressLine1: string | null;
  }) {
    const { street, house } = this.extractStreetAndHouse(listing.addressLine1);

    return [
      this.sanitizePathSegment(listing.country),
      this.sanitizePathSegment(listing.city),
      this.sanitizePathSegment(street),
      this.sanitizePathSegment(house),
      listing.id,
    ];
  }

  private async updateLocation(
    listingId: string,
    longitude: number,
    latitude: number,
  ) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Listing" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      longitude,
      latitude,
      listingId,
    );
  }
}
