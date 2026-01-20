import { PrismaClient, BookingStatus, ListingStatus, NotificationType } from '@prisma/client';
import { hash } from 'bcrypt';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { isAbsolute, join, posix } from 'path';

const prisma = new PrismaClient();

const seedDirPath = __dirname;

const IMAGE_BASE_URL = (process.env.IMAGES_BASE_URL || 'http://localhost:4001/images').replace(/\/$/, '');
const IMAGE_ROOT = (() => {
  const configured = process.env.IMAGES_ROOT;
  if (configured) {
    if (isAbsolute(configured)) {
      return configured;
    }
    return join(process.cwd(), configured);
  }
  return join(seedDirPath, '..', '..', '..', 'images');
})();

type SeedListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  summary: string;
  propertyType: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  cleaningFee?: number;
  serviceFee?: number;
  instantBook?: boolean;
  featured?: boolean;
  checkInFrom?: number;
  checkOutUntil?: number;
  minNights?: number;
  maxNights?: number;
  rating?: number;
  reviewCount?: number;
  status?: ListingStatus;
  addressLine1: string;
  city: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  street: string;
  house: string;
  amenityNames: string[];
  images: Array<{
    fileName: string;
    description?: string;
    isPrimary?: boolean;
  }>;
};

const amenitiesData = [
  { name: 'Wi-Fi', icon: 'wifi', category: 'Comfort' },
  { name: 'Kitchen', icon: 'kitchen', category: 'Essentials' },
  { name: 'Washer', icon: 'local_laundry_service', category: 'Essentials' },
  { name: 'Air Conditioning', icon: 'ac_unit', category: 'Comfort' },
  { name: 'Heating', icon: 'thermostat', category: 'Comfort' },
  { name: 'Workspace', icon: 'chair', category: 'Business' },
  { name: 'Parking', icon: 'local_parking', category: 'Travel' },
  { name: 'Pool', icon: 'pool', category: 'Lifestyle' },
  { name: 'Hot Tub', icon: 'hot_tub', category: 'Lifestyle' },
  { name: 'Fireplace', icon: 'fireplace', category: 'Comfort' },
];

const listingsToSeed: SeedListing[] = [
  {
    id: 'listing_radiant_loft',
    slug: 'radiant-loft-patriarch-ponds',
    title: 'Radiant Loft near Patriarch Ponds',
    description:
      'A light-filled two-bedroom loft in the historic center with artisan furniture, smart climate control, and a spacious living zone.',
    summary: 'Boutique loft for design lovers in Moscow.',
    propertyType: 'apartment',
    guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1.5,
    basePrice: 4800,
    cleaningFee: 900,
    serviceFee: 450,
    instantBook: true,
    featured: true,
    checkInFrom: 14,
    checkOutUntil: 12,
    minNights: 2,
    maxNights: 21,
    rating: 4.95,
    reviewCount: 38,
    status: ListingStatus.PUBLISHED,
    addressLine1: '12 Spiridonovka St',
    city: 'Moscow',
    country: 'Russia',
    postalCode: '123001',
    latitude: 55.76159,
    longitude: 37.5942,
    street: 'Spiridonovka Street',
    house: '12',
    amenityNames: [
      'Wi-Fi',
      'Kitchen',
      'Washer',
      'Air Conditioning',
      'Workspace',
      'Fireplace',
    ],
    images: [
      {
        fileName: 'loft-living.jpg',
        description: 'Sunlit living room with open plan kitchen.',
        isPrimary: true,
      },
      {
        fileName: 'loft-bedroom.jpg',
        description: 'Master bedroom with king bed and balcony.',
      },
      {
        fileName: 'loft-bathroom.jpg',
        description: 'Bathroom with rain shower and marble details.',
      },
    ],
  },
  {
    id: 'listing_nevsky_flat',
    slug: 'art-deco-flat-nevsky',
    title: 'Art Deco Flat on Nevsky Prospekt',
    description:
      'Elegant one-bedroom apartment overlooking the main avenue. Restored parquet floors, curated art, premium bedding, and secure entry.',
    summary: 'Curated stay in the heart of Saint Petersburg.',
    propertyType: 'apartment',
    guests: 3,
    bedrooms: 1,
    beds: 2,
    bathrooms: 1,
    basePrice: 3600,
    cleaningFee: 700,
    serviceFee: 350,
    instantBook: false,
    checkInFrom: 15,
    checkOutUntil: 11,
    minNights: 1,
    maxNights: 14,
    rating: 4.82,
    reviewCount: 19,
    status: ListingStatus.PUBLISHED,
    addressLine1: '56 Nevsky Prospekt',
    city: 'Saint Petersburg',
    country: 'Russia',
    postalCode: '191025',
    latitude: 59.93428,
    longitude: 30.3351,
    street: 'Nevsky Prospekt',
    house: '56',
    amenityNames: ['Wi-Fi', 'Kitchen', 'Heating', 'Workspace', 'Parking'],
    images: [
      {
        fileName: 'nevsky-living.jpg',
        description: 'Living room with curated art and city views.',
        isPrimary: true,
      },
      {
        fileName: 'nevsky-bedroom.jpg',
        description: 'Bedroom with queen bed and blackout curtains.',
      },
      {
        fileName: 'nevsky-workspace.jpg',
        description: 'Dedicated workspace with ergonomic chair.',
      },
    ],
  },
];

function sanitizeSegment(segment: string) {
  return segment
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s{2,}/g, ' ');
}

function sanitizeFileName(fileName: string) {
  return sanitizeSegment(fileName);
}

function buildImagePathSegments(listing: SeedListing) {
  return [
    sanitizeSegment(listing.country),
    sanitizeSegment(listing.city),
    sanitizeSegment(listing.street),
    sanitizeSegment(listing.house),
    sanitizeSegment(listing.id),
  ];
}

function ensureImageFile(
  segments: string[],
  fileName: string,
): { relativePath: string; url: string } {
  const safeFileName = sanitizeFileName(fileName);
  const destinationDir = join(IMAGE_ROOT, ...segments);
  const destinationPath = join(destinationDir, safeFileName);

  if (!existsSync(destinationDir)) {
    mkdirSync(destinationDir, { recursive: true });
  }

  if (!existsSync(destinationPath)) {
    const legacyCandidates = [
      join(IMAGE_ROOT, safeFileName),
      join(IMAGE_ROOT, fileName),
    ];

    const existingSource = legacyCandidates.find((candidate) => existsSync(candidate));

    if (existingSource) {
      copyFileSync(existingSource, destinationPath);
    } else {
      console.warn(
        `Seed warning: source image "${fileName}" was not found. ` +
          `Expected one of: ${legacyCandidates.join(', ')}`,
      );
    }
  }

  const relativePath = posix.join(...segments, safeFileName);
  const url = `${IMAGE_BASE_URL}/${segments
    .map((segment) => encodeURIComponent(segment))
    .join('/')}/${encodeURIComponent(safeFileName)}`;

  return { relativePath, url };
}

async function clearExistingData() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.review.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.propertyImage.deleteMany(),
    prisma.listingAmenity.deleteMany(),
    prisma.listing.deleteMany(),
  ]);
}

async function seedAmenities() {
  await prisma.amenity.createMany({ data: amenitiesData, skipDuplicates: true });

  const amenities = await prisma.amenity.findMany({
    where: { name: { in: amenitiesData.map((item) => item.name) } },
  });

  const map = new Map(amenities.map((amenity) => [amenity.name, amenity.id]));
  return (name: string) => map.get(name);
}

async function seedUsers(password: string) {
  const [host, guest, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'host@example.com' },
      update: {},
      create: {
        email: 'host@example.com',
        phone: '+79000000001',
        password,
        role: 'HOST',
        isVerified: true,
        isSuperhost: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Elena',
            lastName: 'Morozova',
            bio: 'Design-focused host sharing curated stays in Moscow.',
            languages: ['Russian', 'English'],
            verified: true,
            responseRate: 0.97,
            responseTimeMinutes: 25,
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.upsert({
      where: { email: 'guest@example.com' },
      update: {},
      create: {
        email: 'guest@example.com',
        phone: '+79000000002',
        password,
        role: 'GUEST',
        isVerified: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Sergey',
            lastName: 'Ivanov',
            bio: 'Remote product manager exploring European capitals.',
            languages: ['Russian', 'English'],
            verified: true,
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        phone: '+79000000003',
        password,
        role: 'ADMIN',
        isVerified: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            firstName: 'Maksim',
            lastName: 'Petrov',
            bio: 'Platform administrator.',
            languages: ['Russian', 'English'],
            verified: true,
          },
        },
      },
      include: { profile: true },
    }),
  ]);

  return { host, guest, admin };
}

async function seedListings(hostId: string, amenityIdByName: (name: string) => number | undefined) {
  const createdListings = [] as { id: string; latitude: number; longitude: number }[];

  for (const definition of listingsToSeed) {
    const pathSegments = buildImagePathSegments(definition);

    const listing = await prisma.listing.create({
      data: {
        id: definition.id,
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        summary: definition.summary,
        propertyType: definition.propertyType,
        hostId,
        guests: definition.guests,
        bedrooms: definition.bedrooms,
        beds: definition.beds,
        bathrooms: definition.bathrooms,
        basePrice: definition.basePrice,
        cleaningFee: definition.cleaningFee,
        serviceFee: definition.serviceFee,
        instantBook: definition.instantBook ?? false,
        featured: definition.featured ?? false,
        checkInFrom: definition.checkInFrom,
        checkOutUntil: definition.checkOutUntil,
        minNights: definition.minNights,
        maxNights: definition.maxNights,
        rating: definition.rating,
        reviewCount: definition.reviewCount ?? 0,
        status: definition.status ?? ListingStatus.PUBLISHED,
        addressLine1: definition.addressLine1,
        city: definition.city,
        country: definition.country,
        postalCode: definition.postalCode,
        latitude: definition.latitude,
        longitude: definition.longitude,
        amenities: {
          create: definition.amenityNames
            .map((name) => amenityIdByName(name))
            .filter((id): id is number => typeof id === 'number')
            .map((id) => ({ amenityId: id })),
        },
        images: {
          create: definition.images.map((image, index) => {
            const { relativePath } = ensureImageFile(pathSegments, image.fileName);
            return {
              url: relativePath,
              description: image.description,
              position: index,
              isPrimary: image.isPrimary ?? index === 0,
            };
          }),
        },
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE "Listing" SET "location" = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography WHERE id = $3`,
      definition.longitude,
      definition.latitude,
      listing.id,
    );

    createdListings.push({
      id: listing.id,
      latitude: definition.latitude,
      longitude: definition.longitude,
    });
  }

  return createdListings;
}

async function seedBookingAndReview(listingId: string, guestId: string) {
  const futureCheckIn = new Date();
  futureCheckIn.setMonth(futureCheckIn.getMonth() + 1);
  const futureCheckOut = new Date(futureCheckIn);
  futureCheckOut.setDate(futureCheckIn.getDate() + 3);

  const booking = await prisma.booking.create({
    data: {
      listingId,
      guestId,
      checkIn: futureCheckIn,
      checkOut: futureCheckOut,
      status: BookingStatus.CONFIRMED,
      adults: 2,
      children: 0,
      totalPrice: 15850,
      currency: 'RUB',
    },
  });

  await prisma.review.create({
    data: {
      rating: 5,
      comment: 'Spotless loft, attentive host, and perfect location for creative stays.',
      listingId,
      bookingId: booking.id,
      authorId: guestId,
      cleanliness: 5,
      communication: 5,
      checkIn: 5,
      accuracy: 5,
      location: 5,
      value: 5,
      isPublic: true,
      isFeatured: true,
    },
  });

  const ratingAggregate = await prisma.review.aggregate({
    where: { listingId },
    _avg: { rating: true },
  });

  const reviewCount = await prisma.review.count({ where: { listingId } });

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      rating: ratingAggregate._avg.rating ?? 0,
      reviewCount,
    },
  });

  return booking;
}

async function seedNotifications(params: {
  hostId: string;
  guestId: string;
  listingId: string;
  bookingId: string;
}) {
  await prisma.notification.createMany({
    data: [
      {
        userId: params.hostId,
        type: NotificationType.NEW_REVIEW,
        title: 'New review received',
        body: 'Your guest left a new 5-star review.',
        data: { listingId: params.listingId },
      },
      {
        userId: params.guestId,
        type: NotificationType.BOOKING_CONFIRMATION,
        title: 'Booking confirmed',
        body: 'See you soon at Radiant Loft near Patriarch Ponds.',
        data: { bookingId: params.bookingId },
      },
    ],
  });
}

async function main() {
  console.log('Seeding database for "Milyi Dom"...');

  await clearExistingData();

  console.log('Existing records cleared.');

  const amenityIdByName = await seedAmenities();
  console.log('Amenities prepared.');

  const password = await hash('password123', 12);
  const { host, guest } = await seedUsers(password);
  console.log('Core users seeded.');

  const listings = await seedListings(host.id, amenityIdByName);
  console.log(`Seeded ${listings.length} showcase listings.`);

  if (listings.length > 0) {
    const booking = await seedBookingAndReview(listings[0].id, guest.id);
    await seedNotifications({
      hostId: host.id,
      guestId: guest.id,
      listingId: listings[0].id,
      bookingId: booking.id,
    });
    console.log('Sample booking, review, and notifications created.');
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
