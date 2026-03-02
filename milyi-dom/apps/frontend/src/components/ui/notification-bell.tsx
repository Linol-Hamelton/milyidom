'use client';

import { useEffect, useState, useCallback } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useSocketEvent } from '../../hooks/useSocket';
import { api } from '../../lib/api-client';

interface Notification {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt?: string;
}

interface UnreadCountResponse {
  count: number;
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Notification[]>([]);

  // Fetch initial unread count
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<UnreadCountResponse>('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {
      // Ignore errors — bell should never break the UI
    }
  }, []);

  useEffect(() => {
    void fetchCount();
  }, [fetchCount]);

  // Real-time: increment badge on new notification
  useSocketEvent<Notification>('notification', (notification) => {
    setUnreadCount((c) => c + 1);
    setRecent((prev) => [notification, ...prev].slice(0, 5));
  });

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      // Optimistically clear badge; backend marks all read
      setUnreadCount(0);
      void api.patch('/notifications/read-all').catch(() => null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-rose-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-2xl bg-white shadow-xl border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Уведомления</h3>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  Нет новых уведомлений
                </p>
              ) : (
                recent.map((n, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <a
                href="/notifications"
                className="text-xs text-rose-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                Все уведомления →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
