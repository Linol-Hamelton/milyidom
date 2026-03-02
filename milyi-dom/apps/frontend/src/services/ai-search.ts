import { api } from '../lib/api-client';
import type { ListingSearchFilters } from '../types/api';

export interface AiSearchParams {
  q: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  maxGuests?: number;
  bedroomsCount?: number;
  amenities?: string[];
  sortBy?: 'rating' | 'pricePerNight' | 'reviewsCount';
  sortOrder?: 'asc' | 'desc';
}

export interface AiSearchResponse {
  params: AiSearchParams;
  interpretation: string;
}

export async function interpretQuery(query: string): Promise<AiSearchResponse> {
  const { data } = await api.post<AiSearchResponse>('/ai-search/interpret', { query });
  return data;
}

/** Map AI search params to ListingSearchFilters for the existing search API */
export function aiParamsToFilters(params: AiSearchParams): Partial<ListingSearchFilters> {
  const filters: Partial<ListingSearchFilters> = {};

  if (params.city) filters.city = params.city;
  if (params.country) filters.country = params.country;
  if (params.minPrice) filters.minPrice = params.minPrice;
  if (params.maxPrice) filters.maxPrice = params.maxPrice;
  if (params.maxGuests) filters.guests = params.maxGuests;

  if (params.sortBy === 'pricePerNight' && params.sortOrder === 'asc') {
    filters.sort = 'price_low';
  } else if (params.sortBy === 'pricePerNight' && params.sortOrder === 'desc') {
    filters.sort = 'price_high';
  } else if (params.sortBy === 'rating') {
    filters.sort = 'rating';
  }

  return filters;
}
