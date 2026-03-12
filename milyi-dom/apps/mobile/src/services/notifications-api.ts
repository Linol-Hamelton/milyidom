import { apiClient } from '@/api/client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const { data } = await apiClient.get<{ items: AppNotification[]; meta: unknown }>('/notifications');
  return Array.isArray(data) ? data : (data as { items: AppNotification[] }).items;
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`, {});
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.patch('/notifications/read-all', {});
};
