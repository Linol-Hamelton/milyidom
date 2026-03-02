import { api } from '../lib/api-client';
import type { User } from '../types/api';

export async function fetchCurrentUser() {
  const { data } = await api.get<User>('/users/me');
  return data;
}

export async function updateAccount(payload: {
  user?: { phone?: string };
  profile?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
    languages?: string[];
  };
}) {
  const { data } = await api.patch<User>('/users/me', payload);
  return data;
}

export async function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  languages?: string[];
}) {
  const { data } = await api.patch<User>('/users/me/profile', payload);
  return data;
}

export async function fetchUserStats() {
  const { data } = await api.get('/users/me/stats');
  return data as { listings: number; bookings: number; reviews: number; favorites: number };
}

export async function fetchTopHosts(limit?: number) {
  const query = limit ? `?limit=${limit}` : '';
  const { data } = await api.get<User[]>(`/users/top-hosts${query}`);
  return data;
}

export async function verifyUser(userId: string) {
  const { data } = await api.patch<User>(`/users/${userId}/verify`, {});
  return data;
}

export async function promoteSuperhost(userId: string) {
  const { data } = await api.patch<User>(`/users/${userId}/promote-superhost`, {});
  return data;
}

export type NotificationPrefs = {
  notifEmailBookings: boolean;
  notifEmailMessages: boolean;
  notifEmailSavedSearches: boolean;
  notifEmailMarketing: boolean;
};

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const { data } = await api.get<NotificationPrefs>('/users/me/notification-prefs');
  return data;
}

export async function updateNotificationPrefs(
  prefs: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const { data } = await api.patch<NotificationPrefs>('/users/me/notification-prefs', prefs);
  return data;
}

export async function deleteMe(): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>('/users/me');
  return data;
}

export async function exportMyData(): Promise<void> {
  const { data } = await api.get('/users/me/export');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-data.json';
  a.click();
  URL.revokeObjectURL(url);
}
