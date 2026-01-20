export type Role = 'GUEST' | 'HOST' | 'ADMIN';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  languages: string[];
  verified: boolean;
  responseRate?: number | null;
  responseTimeMinutes?: number | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  isVerified: boolean;
  isSuperhost: boolean;
  profile?: Profile | null;
}

export interface Amenity {
  id: number;
  name: string;
  category: string;
  icon?: string | null;
}

export interface PropertyImage {
  id: string;
  url: string;
  description?: string | null;
  position: number;
  isPrimary: boolean;
}

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNLISTED';

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  summary?: string | null;
  propertyType: string;
  hostId: string;
  host: User;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: string; // Prisma Decimal as string
  basePrice: string;
  cleaningFee?: string | null;
  serviceFee?: string | null;
  currency: string;
  status: ListingStatus;
  instantBook: boolean;
  checkInFrom?: number | null;
  checkOutUntil?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
  rating?: number | null;
  reviewCount: number;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude: string;
  longitude: string;
  images: PropertyImage[];
  amenities: { amenity: Amenity }[];
  favorites?: Favorite[];
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  listingId: string;
  listing: Listing;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: string;
  listingId: string;
  listing: Listing;
  guestId: string;
  guest?: User;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  totalPrice: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingStats {
  items: Booking[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  listingId: string;
  authorId: string;
  author: User;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
  createdAt: string;
  isPublic?: boolean;
  isFeatured?: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  detailedRatings: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'MESSAGE' | 'NEW_REVIEW' | 'SYSTEM';
  title: string;
  body: string;
  data?: unknown;
  readAt?: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId?: string | null;
  hostId: string;
  guestId: string;
  listing?: Listing | null;
  host: User;
  guest: User;
  messages: Message[];
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt?: string | null;
  sentAt: string;
  sender?: User;
  recipient?: User;
}

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface Payment {
  id: string;
  bookingId: string;
  providerId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  method: string;
  receiptUrl?: string | null;
  capturedAt?: string | null;
  booking?: Booking;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ListingSearchFilters {
  location?: string;
  city?: string;
  country?: string;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  instantBook?: boolean;
  propertyType?: string;
  amenities?: number[];
  minRating?: number;
  page?: number;
  limit?: number;
  sort?: 'price_low' | 'price_high' | 'rating' | 'new';
}
