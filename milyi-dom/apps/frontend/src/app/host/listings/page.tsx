"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button, buttonClassName } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Pagination } from '../../../components/ui/pagination';
import { fetchHostListings, updateListingStatus, deleteListing } from '../../../services/listings';
import type { Listing } from '../../../types/api';
import { parseError } from '../../../lib/api-client';
import EmptyState from '../../../components/ui/empty-state';

const STATUS_LABELS: Record<Listing['status'], string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликовано',
  UNLISTED: 'Снято с публикации',
};

const PAGE_LIMIT = 12;

export default function HostListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadListings = async (nextPage = 1) => {
    setLoading(true);
    try {
      const data = await fetchHostListings({ page: nextPage, limit: PAGE_LIMIT });
      setListings(data.items);
      setTotal(data.meta.total);
      setPage(data.meta.page);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const totalPages = Math.max(Math.ceil(total / PAGE_LIMIT), 1);

  const handleStatusChange = async (listingId: string, status: Listing['status']) => {
    const snapshot = listings;
    setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status } : l)));

    try {
      await updateListingStatus(listingId, status);
      toast.success('Статус обновлён');
    } catch (error) {
      setListings(snapshot);
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Удалить объявление? Это действие нельзя отменить.')) return;
    try {
      await deleteListing(listingId);
      toast.success('Объявление удалено');
      await loadListings(page);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-2xl px-4 sm:px-6 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-wide text-pine-600">Ваши объявления</p>
              <h1 className="text-3xl font-serif text-slate-900">Управляйте размещением</h1>
              <p className="text-sm text-slate-600">
                Следите за актуальностью описаний, цен и статусов, чтобы гости быстрее находили ваше жильё.
              </p>
            </div>
            <Link href="/host/listings/new" className={buttonClassName({})}>
              Добавить объявление
            </Link>
          </header>

          {loading ? (
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-3xl" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState
              emoji="🏠"
              title="Пока нет объявлений"
              description="Добавьте первое размещение и откройте его для гостей."
              cta={{ label: 'Создать объявление', href: '/host/listings/new' }}
              className="mt-12"
            />
          ) : (
            <>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {listings.map((listing) => (
                <article key={listing.id} className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{listing.title}</h2>
                      <p className="text-xs text-slate-500">{listing.city}, {listing.country}</p>
                    </div>
                    <Link
                      href={`/host/listings/${listing.id}/edit`}
                      className={buttonClassName({ variant: 'ghost' })}
                    >
                      Редактировать
                    </Link>
                  </div>
                  <p className="text-sm text-slate-600">
                    {listing.summary ?? `${listing.description.slice(0, 120)}${listing.description.length > 120 ? '…' : ''}`}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-400">
                    <span>Статус: {STATUS_LABELS[listing.status] ?? listing.status}</span>
                    <span>Гостей: {listing.guests}</span>
                    <span>
                      Стоимость: {Number(listing.basePrice).toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: listing.currency,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/host/listings/${listing.id}/availability`}
                      className={buttonClassName({ variant: 'ghost' })}
                    >
                      Доступность
                    </Link>
                    <Button variant="ghost" onClick={() => handleStatusChange(listing.id, 'PUBLISHED')}>
                      Опубликовать
                    </Button>
                    <Button variant="ghost" onClick={() => handleStatusChange(listing.id, 'UNLISTED')}>
                      Скрыть
                    </Button>
                    <Button variant="ghost" onClick={() => handleStatusChange(listing.id, 'DRAFT')}>
                      В черновики
                    </Button>
                    <Button variant="ghost" className="text-rose-600" onClick={() => handleDelete(listing.id)}>
                      Удалить
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              itemCount={listings.length}
              itemLabel="объявлений"
              loading={loading}
              onPrev={() => loadListings(page - 1)}
              onNext={() => loadListings(page + 1)}
            />
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
