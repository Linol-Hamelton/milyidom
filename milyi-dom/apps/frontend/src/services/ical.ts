import { api } from '../lib/api-client';

export const getIcalFeedUrl = (icalToken: string) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? ''}/ical/feed/${icalToken}`;

export async function syncExternalCalendar(listingId: string, url: string) {
  const { data } = await api.post<{ added: number }>(`/ical/sync/${listingId}`, { url });
  return data;
}

export async function removeSyncUrl(listingId: string, url: string) {
  await api.delete(`/ical/sync/${listingId}`, { data: { url } });
}

export async function getSyncUrls(listingId: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/ical/sync/${listingId}`);
  return data;
}

export async function getBlockedDates(listingId: string): Promise<string[]> {
  const { data } = await api.get<string[]>(`/ical/blocked/${listingId}`);
  return data;
}

export async function getBlockedDatesDetailed(listingId: string): Promise<{ date: string; source: string }[]> {
  const { data } = await api.get<{ date: string; source: string }[]>(`/ical/blocked/${listingId}/detailed`);
  return data;
}

export async function blockDates(listingId: string, dates: string[]) {
  const { data } = await api.post<{ blocked: number }>(`/ical/block/${listingId}`, { dates });
  return data;
}

export async function unblockDates(listingId: string, dates: string[]) {
  const { data } = await api.delete<{ unblocked: number }>(`/ical/block/${listingId}`, {
    data: { dates },
  });
  return data;
}
