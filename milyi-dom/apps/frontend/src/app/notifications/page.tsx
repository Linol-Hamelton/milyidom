"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import type { Notification } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 20 });
      setNotifications(data.items || []);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  return (
    <RequireAuth>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-lg px-6 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wide text-pine-600">Уведомления</p>
              <h1 className="text-3xl font-serif text-slate-900">Все важные события вашего аккаунта</h1>
              <p className="text-sm text-slate-600">
                Мы сообщаем о подтверждениях бронирований, новых сообщениях, отзывах и системных событиях.
              </p>
            </div>
            <Button variant="ghost" onClick={handleMarkAll}>
              Отметить всё прочитанным
            </Button>
          </header>

          {loading ? (
            <div className="mt-10 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-3xl" />
              ))}
            </div>
          ) : notifications && notifications.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Новых уведомлений нет</h2>
              <p className="mt-2 text-sm text-slate-500">Мы оповестим вас, как только появятся важные события.</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {notifications?.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-3xl border bg-white p-6 shadow-soft transition ${
                    notification.readAt ? 'border-slate-100' : 'border-pine-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{notification.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(notification.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    {!notification.readAt && (
                      <Button variant="ghost" onClick={() => handleMarkRead(notification.id)}>
                        Прочитано
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

