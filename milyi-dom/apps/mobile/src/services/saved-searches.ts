import { apiClient } from '@/api/client';

export interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}

export const fetchSavedSearches = async (): Promise<SavedSearch[]> => {
  const { data } = await apiClient.get<SavedSearch[]>('/saved-searches');
  return data;
};

export const deleteSavedSearch = async (id: string): Promise<void> => {
  await apiClient.delete(`/saved-searches/${id}`);
};
