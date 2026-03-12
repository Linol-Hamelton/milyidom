import { apiClient } from '@/api/client';

export interface FavoriteListing {
  id: string;
  title: string;
  city: string;
  country: string;
  basePrice: number | string;
  currency: string;
  images: { url: string; isPrimary: boolean }[];
}

export interface Favorite {
  id: string;
  listingId: string;
  listing: FavoriteListing;
  createdAt: string;
}

export const fetchFavorites = async (): Promise<Favorite[]> => {
  const { data } = await apiClient.get<{ items: Favorite[]; meta: unknown }>('/favorites');
  return data.items;
};

export const removeFromFavorites = async (listingId: string): Promise<void> => {
  await apiClient.delete(`/favorites/${listingId}`);
};
