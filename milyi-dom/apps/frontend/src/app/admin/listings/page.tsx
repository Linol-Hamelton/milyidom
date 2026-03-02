"use client";

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { fetchAdminListings, moderateListing } from '../../../services/admin';
import { parseError } from '../../../lib/api-client';
import type { Listing, ListingStatus, PaginatedResponse } from '../../../types/api';

const STATUSES: ListingStatus[] = ['DRAFT', 'PUBLISHED', 'UNLISTED'];

const statusColor: Record<ListingStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-green-50 text-green-700',
  UNLISTED: 'bg-amber-50 text-amber-700',
};

export default function AdminListingsPage() {
  const [data, setData] = useState<PaginatedResponse<Listing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatus | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminListings({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setData(result);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleModerate = async (listingId: string, status: ListingStatus) => {
    try {
      await moderateListing(listingId, status);
      const statusLabels: Record<string, string> = { PUBLISHED: 'опубликовано', UNLISTED: 'снято с публикации', DRAFT: 'переведено в черновики' };
      toast.success(`Объявление ${statusLabels[status] ?? status.toLowerCase()}`);
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Администратор / Объявления</p>
        <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900">Модерация объявлений</h1>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 py-2 shadow-soft">
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-52 bg-transparent text-sm outline-none"
          />
          <Button variant="ghost" onClick={handleSearch} className="px-2 py-0.5 text-xs">
            Найти
          </Button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ListingStatus | ''); setPage(1); }}
          className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-soft outline-none"
        >
          <option value="">Все статусы</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))
          : data?.items.map((listing) => {
              const thumb = listing.images?.[0]?.url;
              return (
                <article key={listing.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-soft">
                  {thumb ? (
                    <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                      <Image src={thumb} alt={listing.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 w-32 shrink-0 rounded-xl bg-sand-100" />
                  )}

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 line-clamp-1">{listing.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[listing.status]}`}>
                          {listing.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {listing.city}, {listing.country} · {listing.host.profile?.firstName ?? listing.host.email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        ₽{listing.basePrice}/ночь · ⭐ {listing.rating ?? '—'} ({listing.reviewCount})
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {listing.status !== 'PUBLISHED' && (
                        <Button
                          variant="ghost"
                          onClick={() => handleModerate(listing.id, 'PUBLISHED')}
                          className="px-2 py-1 text-xs text-green-700"
                        >
                          Опубликовать
                        </Button>
                      )}
                      {listing.status !== 'UNLISTED' && (
                        <Button
                          variant="ghost"
                          onClick={() => handleModerate(listing.id, 'UNLISTED')}
                          className="px-2 py-1 text-xs text-amber-700"
                        >
                          Снять с публикации
                        </Button>
                      )}
                      {listing.status !== 'DRAFT' && (
                        <Button
                          variant="ghost"
                          onClick={() => handleModerate(listing.id, 'DRAFT')}
                          className="px-2 py-1 text-xs text-slate-600"
                        >
                          В черновики
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>{data.meta.total} объявлений — стр. {page} из {totalPages}</span>
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
