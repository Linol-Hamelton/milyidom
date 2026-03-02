"use client";

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { fetchAuditLog } from '../../../services/admin';
import { parseError } from '../../../lib/api-client';
import type { AuditLog, AuditAction, PaginatedResponse } from '../../../types/api';

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  USER_LOGIN: 'Вход в систему',
  USER_REGISTER: 'Регистрация',
  BOOKING_CREATE: 'Бронирование создано',
  BOOKING_CANCEL: 'Бронирование отменено',
  BOOKING_STATUS_CHANGE: 'Статус бронирования изменён',
  LISTING_CREATE: 'Объявление создано',
  LISTING_STATUS_CHANGE: 'Статус объявления изменён',
  ADMIN_USER_ROLE_CHANGE: 'Роль изменена',
  ADMIN_USER_BLOCK: 'Пользователь заблокирован/разблокирован',
  ADMIN_LISTING_MODERATE: 'Объявление промодерировано',
  PAYMENT_COMPLETE: 'Платёж завершён',
};

const actionColor = (action: AuditAction): string => {
  if (action.startsWith('ADMIN_')) return 'bg-purple-50 text-purple-700';
  if (action.startsWith('BOOKING_')) return 'bg-blue-50 text-blue-700';
  if (action.startsWith('LISTING_')) return 'bg-pine-50 text-pine-700';
  if (action.startsWith('PAYMENT_')) return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
};

export default function AuditLogPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAuditLog({
        page,
        limit: 50,
        action: actionFilter || undefined,
        resourceType: resourceTypeFilter || undefined,
      });
      setData(result);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, resourceTypeFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Администратор / Журнал</p>
        <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900">Журнал действий</h1>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-soft outline-none"
        >
          <option value="">Все действия</option>
          <optgroup label="Администратор">
            <option value="ADMIN_USER_ROLE_CHANGE">Смена роли</option>
            <option value="ADMIN_USER_BLOCK">Блокировка пользователя</option>
            <option value="ADMIN_LISTING_MODERATE">Модерация объявления</option>
          </optgroup>
          <optgroup label="Аутентификация">
            <option value="USER_LOGIN">Вход в систему</option>
            <option value="USER_REGISTER">Регистрация</option>
            <option value="PASSWORD_RESET">Сброс пароля</option>
          </optgroup>
          <optgroup label="Бронирования">
            <option value="BOOKING_CREATE">Создание бронирования</option>
            <option value="BOOKING_CANCEL">Отмена бронирования</option>
          </optgroup>
          <optgroup label="Платежи">
            <option value="PAYMENT_COMPLETE">Платёж завершён</option>
          </optgroup>
        </select>

        <select
          value={resourceTypeFilter}
          onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-soft outline-none"
        >
          <option value="">Все ресурсы</option>
          <option value="User">Пользователь</option>
          <option value="Listing">Объявление</option>
          <option value="Booking">Бронирование</option>
          <option value="Payment">Платёж</option>
        </select>
      </div>

      {/* Log table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Время</th>
              <th className="px-4 py-3">Пользователь</th>
              <th className="px-4 py-3">Действие</th>
              <th className="px-4 py-3">Ресурс</th>
              <th className="px-4 py-3">Подробности</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-sand-50">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-4 w-full rounded" />
                    </td>
                  </tr>
                ))
              : data?.items.map((log) => (
                  <tr key={log.id} className="border-b border-sand-50 hover:bg-sand-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-700">{log.userEmail ?? '—'}</p>
                      {log.userRole && <p className="text-xs text-slate-400">{log.userRole}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionColor(log.action)}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {log.resourceType && <span>{log.resourceType}</span>}
                      {log.resourceId && (
                        <span className="ml-1 font-mono text-slate-400">
                          {log.resourceId.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{data.meta.total} записей — стр. {page} из {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-xs">
              Назад
            </Button>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-xs">
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
