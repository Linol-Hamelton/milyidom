import { api } from '../lib/api-client';

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  notifyEmail: boolean;
  createdAt: string;
};

export async function fetchSavedSearches(): Promise<SavedSearch[]> {
  const { data } = await api.get<SavedSearch[]>('/saved-searches');
  return data;
}

export async function createSavedSearch(payload: {
  name: string;
  filters: Record<string, unknown>;
  notifyEmail?: boolean;
}): Promise<SavedSearch> {
  const { data } = await api.post<SavedSearch>('/saved-searches', payload);
  return data;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  await api.delete(`/saved-searches/${id}`);
}
