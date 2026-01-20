import { api } from '../lib/api-client';
import type { Notification, PaginatedResponse } from '../types/api';

const buildQuery = (params?: { page?: number; limit?: number }) => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export async function fetchNotifications(params?: { page?: number; limit?: number }) {
  try {
    const qs = buildQuery(params);
    const { data } = await api.get<PaginatedResponse<Notification>>(`/notifications${qs}`);
    return data;
  } catch (error) {
    console.warn('Could not fetch notifications:', error);
    return {
      items: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  }
}

export async function markNotificationRead(id: string) {
  try {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`, {});
    return data;
  } catch (error) {
    console.warn(`Could not mark notification ${id} as read:`, error);
    throw error;
  }
}

export async function markAllNotificationsRead() {
  try {
    const { data } = await api.patch('/notifications/read-all', {});
    return data as { success: boolean };
  } catch (error) {
    console.warn('Could not mark all notifications as read:', error);
    throw error;
  }
}

export async function fetchUnreadCount() {
  try {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data;
  } catch (error) {
    console.warn('Could not fetch unread notifications count:', error);
    return { count: 0 };
  }
}
