import { apiClient } from '../api/client';

export interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
  position: number;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string;
  propertyType: string;
  city: string;
  country: string;
  addressLine1: string;
  latitude: number;
  longitude: number;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: string | number;
  basePrice: string | number;
  cleaningFee?: string | number | null;
  currency: string;
  instantBook: boolean;
  rating?: number | null;
  reviewCount: number;
  amenities?: Array<{ amenity: { name: string; icon?: string | null } }>;
  images: ListingImage[];
  host: {
    id: string;
    email: string;
    createdAt: string;
    profile?: { firstName: string; lastName?: string | null; avatarUrl?: string | null } | null;
    isSuperhost: boolean;
  };
}

export interface SearchParams {
  q?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedListings {
  items: Listing[];
  meta: { page: number; limit: number; total: number };
}

export const searchListings = async (params: SearchParams): Promise<PaginatedListings> => {
  const { data } = await apiClient.get<PaginatedListings>('/listings/search', { params });
  return data;
};

export const getFeaturedListings = async (): Promise<Listing[]> => {
  const { data } = await apiClient.get<Listing[]>('/listings/featured');
  return data;
};

export const getListingById = async (id: string): Promise<Listing> => {
  const { data } = await apiClient.get<Listing>(`/listings/${id}`);
  return data;
};

export const getPricingSuggestion = async (id: string) => {
  const { data } = await apiClient.get<{
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
    rationale: string;
    factors: string[];
  }>(`/listings/${id}/pricing-suggestion`);
  return data;
};
