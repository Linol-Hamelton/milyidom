"use client";

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import {
  getAdminDisputes,
  resolveDispute,
  type Dispute,
  type DisputeStatus,
  type DisputesPage,
} from '../../../services/disputes';
import { parseError } from '../../../lib/api-client';

const STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Открыт',
  IN_REVIEW: 'На рассмотрении',
  RESOLVED: 'Решён',
  CLOSED: 'Закрыт',
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const ALL_STATUSES: DisputeStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];

export default function AdminDisputesPage() {
  const [data, setData] = useState<DisputesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | ''>('');
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [resolveStatus, setResolveStatus] = useState<DisputeStatus>('RESOLVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminDisputes({
        page,
        limit: 20,
        status: statusFilter || undefined,
      });
      setData(result);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openResolve = (dispute: Dispute) => {
    setSelected(dispute);
    setResolveStatus('RESOLVED');
    setAdminNotes(dispute.adminNotes ?? '');
  };

  const handleResolve = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await resolveDispute(selected.id, { status: resolveStatus, adminNotes: adminNotes || undefined });
      toast.success('Статус спора обновлён');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Споры</h1>
        <span className="text-sm text-gray-500">{data ? `${data.meta.total} всего` : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as DisputeStatus | ''); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Все статусы</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Тема</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Заявитель</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Объявление</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Статус</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-gray-600">Дата</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.items.map((d) => {
                  const reporter = d.reporter;
                  const name = reporter?.profile
                    ? `${reporter.profile.firstName} ${reporter.profile.lastName}`
                    : reporter?.email ?? '—';
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 max-w-[200px] truncate font-medium text-gray-900">
                        {d.subject}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{name}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">
                        {d.booking?.listing?.title ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResolve(d)}
                          disabled={d.status === 'CLOSED'}
                        >
                          Рассмотреть
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            {!loading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Споров нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}

      {/* Resolve modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Рассмотрение спора</h2>
            <p className="mb-4 text-sm text-gray-600">{selected.subject}</p>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {selected.description}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Новый статус</label>
              <select
                value={resolveStatus}
                onChange={(e) => setResolveStatus(e.target.value as DisputeStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">Заметки администратора</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Решение, причины..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
                Отмена
              </Button>
              <Button onClick={handleResolve} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
