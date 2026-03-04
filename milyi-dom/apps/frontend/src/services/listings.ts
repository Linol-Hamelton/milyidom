import axios from 'axios';
import { api } from '../lib/api-client';
import type { Listing, ListingSearchFilters, ListingStatus, PaginatedResponse } from '../types/api';
import {
  OFFLINE_LISTING_PREFIX,
  getOfflineListingById,
  getOfflineListingBySlug,
  offlineListings,
  searchOfflineListings,
} from '../data/offline-listings';

export type ListingStats = {
  averageRating: number;
  reviewCount: number;
  completedBookings: number;
  detailedRatings: Record<string, number>;
};

export type ListingImageInput = {
  url: string;
  description?: string;
  position?: number;
  isPrimary?: boolean;
};

export type AvailabilityResponse = {
  available: boolean;
  conflictingBookings?: Array<{
    checkIn: string;
    checkOut: string;
  }>;
};

type ListingMutationBase = Omit<Partial<Listing>, 'images'>;

const buildOfflineStats = (listing: Listing): ListingStats => ({
  averageRating: listing.rating ?? 4.8,
  reviewCount: listing.reviewCount ?? 0,
  completedBookings: Math.max(Math.round((listing.reviewCount ?? 0) * 0.7), 12),
  detailedRatings: {
    cleanliness: 4.8,
    communication: 4.9,
    checkIn: 4.9,
    accuracy: 4.7,
    location: 4.8,
    value: 4.6,
  },
});

const findOfflineListing = (ref: string) =>
  getOfflineListingById(ref) ?? getOfflineListingBySlug(ref);

export async function fetchFeaturedListings(options?: { signal?: AbortSignal }) {
  try {
    const { data } = await api.get<Listing[]>('/listings/featured', {
      signal: options?.signal,
    });
    return data;
  } catch (error) {
    console.warn('Falling back to offline featured listings:', error);
    return offlineListings;
  }
}

export async function searchListings(
  filters: ListingSearchFilters,
  options?: { signal?: AbortSignal },
) {
  try {
    const { data } = await api.post<PaginatedResponse<Listing>>('/listings/search', filters, {
      signal: options?.signal,
    });
    return data;
  } catch (error) {
    console.warn('Falling back to offline listings search:', error);
    return searchOfflineListings(filters);
  }
}

export async function fetchListings() {
  try {
    const { data } = await api.get<Listing[]>('/listings');
    return data;
  } catch (error) {
    console.warn('Falling back to offline listings list:', error);
    return offlineListings;
  }
}

export async function fetchListing(ref: string) {
  if (ref.startsWith(OFFLINE_LISTING_PREFIX)) {
    const offlineHit = findOfflineListing(ref);
    if (offlineHit) {
      return offlineHit;
    }
  }

  try {
    const { data } = await api.get<Listing>(`/listings/${ref}`);
    return data;
  } catch (error) {
    console.warn(`Falling back to offline listing for ref ${ref}:`, error);
    const offlineHit = findOfflineListing(ref);
    if (offlineHit) {
      return offlineHit;
    }
    throw error;
  }
}

export async function fetchListingBySlug(slug: string) {
  const offlineHit = findOfflineListing(slug);
  if (offlineHit) {
    return offlineHit;
  }
  const { data } = await api.get<Listing>(`/listings/slug/${slug}`);
  return data;
}

export async function fetchListingStats(ref: string) {
  if (ref.startsWith(OFFLINE_LISTING_PREFIX)) {
    const offlineHit = findOfflineListing(ref);
    if (offlineHit) {
      return buildOfflineStats(offlineHit);
    }
  }

  try {
    const { data } = await api.get<ListingStats>(`/listings/${ref}/stats`);
    return data;
  } catch (error) {
    console.warn(`Falling back to offline stats for listing ${ref}:`, error);
    const offlineHit = findOfflineListing(ref);
    if (offlineHit) {
      return buildOfflineStats(offlineHit);
    }
    throw error;
  }
}

export async function fetchHostListings(params?: { page?: number; limit?: number }) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const url = query ? `/listings/host/me?${query}` : '/listings/host/me';
    const { data } = await api.get<PaginatedResponse<Listing>>(url);
    return data;
  } catch (error) {
    console.warn('Falling back to offline host listings:', error);
    return {
      items: offlineListings,
      meta: {
        page: params?.page ?? 1,
        limit: params?.limit ?? offlineListings.length,
        total: offlineListings.length,
      },
    };
  }
}

export async function createListing(
  payload: ListingMutationBase & {
    images?: ListingImageInput[];
    amenityIds?: number[];
  },
) {
  const { data } = await api.post<Listing>('/listings', payload);
  return data;
}

export async function updateListing(
  id: string,
  payload: ListingMutationBase & {
    images?: ListingImageInput[];
    amenityIds?: number[];
  },
) {
  const { data } = await api.patch<Listing>(`/listings/${id}`, payload);
  return data;
}

export async function updateListingStatus(id: string, status: ListingStatus) {
  const { data } = await api.patch<Listing>(`/listings/${id}/status`, { status });
  return data;
}

export async function deleteListing(id: string) {
  const { data } = await api.delete<Listing>(`/listings/${id}`);
  return data;
}

export async function uploadListingImage(
  listingId: string,
  file: File,
): Promise<{ url: string; key: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ url: string; key: string }>(
    `/listings/${listingId}/images`,
    form,
  );
  return data;
}

export type PricingSuggestion = {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  rationale: string;
  factors: string[];
};

export async function fetchPricingSuggestion(listingId: string): Promise<PricingSuggestion> {
  const { data } = await api.get<PricingSuggestion>(`/listings/${listingId}/pricing-suggestion`);
  return data;
}

export async function checkAvailability(
  listingId: string,
  checkIn: string,
  checkOut: string,
): Promise<AvailabilityResponse> {
  if (listingId.startsWith(OFFLINE_LISTING_PREFIX)) {
    return { available: true };
  }

  try {
    const { data } = await api.post<AvailabilityResponse>(`/listings/${listingId}/availability`, {
      checkIn,
      checkOut,
    });
    return data;
  } catch (error: unknown) {
    console.warn('Could not check availability:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { available: true };
    }
    throw error;
  }
}

export type PriceOverride = {
  id: string;
  listingId: string;
  label: string;
  startDate: string;
  endDate: string;
  price: string;
  createdAt: string;
};

export async function fetchPriceOverrides(listingId: string): Promise<PriceOverride[]> {
  const { data } = await api.get<PriceOverride[]>(`/listings/${listingId}/price-overrides`);
  return data;
}

export async function createPriceOverride(
  listingId: string,
  dto: { label: string; startDate: string; endDate: string; price: number },
): Promise<PriceOverride> {
  const { data } = await api.post<PriceOverride>(`/listings/${listingId}/price-overrides`, dto);
  return data;
}

export async function deletePriceOverride(listingId: string, overrideId: string): Promise<void> {
  await api.delete(`/listings/${listingId}/price-overrides/${overrideId}`);
}

export async function fetchSimilarListings(listingId: string): Promise<Listing[]> {
  try {
    const { data } = await api.get<Listing[]>(`/listings/${listingId}/similar`);
    return data;
  } catch {
    return [];
  }
}

export async function fetchCitiesAutocomplete(q: string): Promise<string[]> {
  try {
    const { data } = await api.get<string[]>('/listings/cities/autocomplete', { params: { q } });
    return data;
  } catch {
    return [];
  }
}
