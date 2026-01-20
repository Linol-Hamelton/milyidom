import type {
  Amenity,
  Listing as ApiListing,
  ListingSearchFilters,
  PaginatedResponse,
  User,
} from '../types/api';
import type { Listing as StaticListing } from '../types';
import { featuredListings } from './listings';
import { fallbackAmenities } from './amenities';

export const OFFLINE_LISTING_PREFIX = 'offline-';

const FALLBACK_PROPERTY_TYPES = ['apartment', 'house', 'villa', 'loft', 'studio'];
const FALLBACK_CURRENCY = 'RUB';

const getFallbackHost = (index: number): User => ({
  id: `${OFFLINE_LISTING_PREFIX}host-${index}`,
  email: `host${index}@milyidom.demo`,
  role: 'HOST',
  isVerified: true,
  isSuperhost: index % 2 === 0,
  profile: {
    id: `${OFFLINE_LISTING_PREFIX}host-profile-${index}`,
    firstName: 'Milyi',
    lastName: `Dom Team ${index + 1}`,
    avatarUrl: undefined,
    bio: 'Demo host profile for offline mode.',
    languages: ['en'],
    verified: true,
    responseRate: 98,
    responseTimeMinutes: 45,
  },
});

const pickAmenities = (index: number): Array<{ amenity: Amenity }> => {
  if (!fallbackAmenities.length) {
    return [];
  }

  const slice = [
    fallbackAmenities[index % fallbackAmenities.length],
    fallbackAmenities[(index + 1) % fallbackAmenities.length],
    fallbackAmenities[(index + 2) % fallbackAmenities.length],
  ];

  return slice.map((amenity) => ({ amenity }));
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const mapStaticListingToApi = (listing: StaticListing, index: number): ApiListing => {
  const [cityPart = listing.location, countryPart = listing.location] = listing.location
    .split(',')
    .map((part) => part.trim());
  const host = getFallbackHost(index);
  const propertyType = FALLBACK_PROPERTY_TYPES[index % FALLBACK_PROPERTY_TYPES.length];
  const createdAt = new Date(Date.UTC(2023, index % 12, (index + 1) * 2)).toISOString();
  const slug = listing.slug ?? slugify(listing.title);
  const offlineId = `${OFFLINE_LISTING_PREFIX}${slug}`;

  return {
    id: offlineId,
    title: listing.title,
    slug,
    description: `Demo listing: ${listing.title}`,
    summary: 'Offline showcase listing available without API access.',
    propertyType,
    hostId: host.id,
    host,
    guests: listing.guests,
    bedrooms: listing.bedrooms,
    beds: listing.bedrooms,
    bathrooms: listing.baths.toString(),
    basePrice: listing.pricePerNight.toString(),
    cleaningFee: null,
    serviceFee: null,
    currency: FALLBACK_CURRENCY,
    status: 'PUBLISHED',
    instantBook: Boolean(listing.instantBook),
    checkInFrom: 15,
    checkOutUntil: 12,
    minNights: 1,
    maxNights: 21,
    rating: listing.rating,
    reviewCount: listing.reviews,
    addressLine1: listing.location,
    addressLine2: null,
    city: cityPart,
    state: null,
    country: countryPart,
    postalCode: '000000',
    latitude: '0',
    longitude: '0',
    images: [
      {
        id: `${offlineId}-image`,
        url: listing.image,
        description: listing.title,
        position: 0,
        isPrimary: true,
      },
    ],
    amenities: pickAmenities(index),
    favorites: [],
    createdAt,
    updatedAt: createdAt,
  };
};

export const offlineListings: ApiListing[] = featuredListings.map(mapStaticListingToApi);

export const getOfflineListingById = (id: string): ApiListing | undefined =>
  offlineListings.find((listing) => listing.id === id);

export const getOfflineListingBySlug = (slug: string): ApiListing | undefined =>
  offlineListings.find(
    (listing) =>
      listing.slug === slug ||
      listing.id === slug ||
      listing.id === `${OFFLINE_LISTING_PREFIX}${slug}`,
  );

export const searchOfflineListings = (
  filters: ListingSearchFilters,
): PaginatedResponse<ApiListing> => {
  const normalizedFilters = {
    ...filters,
    page: filters.page && filters.page > 0 ? filters.page : 1,
    limit: filters.limit && filters.limit > 0 ? filters.limit : 12,
  };

  const cityQuery = normalizedFilters.city?.toLowerCase().trim();
  const countryQuery = normalizedFilters.country?.toLowerCase().trim();
  const amenitiesSet = new Set(normalizedFilters.amenities ?? []);

  let filtered = offlineListings.filter((listing) => {
    if (normalizedFilters.guests && listing.guests < normalizedFilters.guests) return false;
    if (normalizedFilters.instantBook && !listing.instantBook) return false;
    const price = Number(listing.basePrice);
    if (normalizedFilters.minPrice && price < normalizedFilters.minPrice) return false;
    if (normalizedFilters.maxPrice && price > normalizedFilters.maxPrice) return false;
    if (normalizedFilters.propertyType && listing.propertyType !== normalizedFilters.propertyType) return false;
    if (normalizedFilters.minRating && (listing.rating ?? 0) < normalizedFilters.minRating) return false;
    if (cityQuery && !listing.city.toLowerCase().includes(cityQuery)) return false;
    if (countryQuery && !listing.country.toLowerCase().includes(countryQuery)) return false;
    if (amenitiesSet.size > 0) {
      const listingAmenities = listing.amenities.map((entry) => entry.amenity.id);
      for (const amenityId of amenitiesSet) {
        if (!listingAmenities.includes(amenityId)) return false;
      }
    }
    return true;
  });

  switch (normalizedFilters.sort) {
    case 'price_low':
      filtered = filtered.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
      break;
    case 'price_high':
      filtered = filtered.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
      break;
    case 'rating':
      filtered = filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'new':
      filtered = filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    default:
      break;
  }

  const { page, limit } = normalizedFilters;
  const total = filtered.length;
  const totalPages = total === 0 ? 1 : Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const sliceStart = (safePage - 1) * limit;
  const items = filtered.slice(sliceStart, sliceStart + limit);

  return {
    items,
    meta: {
      page: safePage,
      limit,
      total,
    },
  };
};
