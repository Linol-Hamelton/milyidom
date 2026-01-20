import { api } from '../lib/api-client';
import type { Amenity } from '../types/api';
import { fallbackAmenities } from '../data/amenities';

const uniqueCategories = (amenities: Amenity[]) => Array.from(new Set(amenities.map((item) => item.category)));

export async function fetchAmenities(options?: { signal?: AbortSignal }) {
  try {
    const { data } = await api.get<Amenity[]>('/amenities', {
      signal: options?.signal,
    });
    return data;
  } catch (error) {
    console.warn('Falling back to local amenities list:', error);
    return fallbackAmenities;
  }
}

export async function fetchAmenityCategories() {
  try {
    const { data } = await api.get<string[]>('/amenities/categories');
    return data;
  } catch (error) {
    console.warn('Falling back to local amenity categories:', error);
    return uniqueCategories(fallbackAmenities);
  }
}

export async function fetchAmenitiesByCategory(category: string) {
  try {
    const { data } = await api.get<Amenity[]>(`/amenities/category/${category}`);
    return data;
  } catch (error) {
    console.warn(`Falling back to local amenities for category ${category}:`, error);
    return fallbackAmenities.filter((item) => item.category === category);
  }
}

export async function fetchAmenitiesWithCounts() {
  try {
    const { data } = await api.get<Array<Amenity & { _count: { listings: number } }>>(
      '/amenities/with-counts',
    );
    return data;
  } catch (error) {
    console.warn('Falling back to local amenities with counts:', error);
    return fallbackAmenities.map((amenity) => ({
      ...amenity,
      _count: { listings: 3 },
    }));
  }
}



