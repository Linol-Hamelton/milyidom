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
