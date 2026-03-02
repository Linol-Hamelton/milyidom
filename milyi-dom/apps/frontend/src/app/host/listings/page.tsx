"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { fetchHostListings, updateListingStatus, deleteListing } from '../../../services/listings';
import type { Listing } from '../../../types/api';
import { parseError } from '../../../lib/api-client';

const STATUS_LABELS: Record<Listing['status'], string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликовано',
  UNLISTED: 'Снято с публикации',
};

export default function HostListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await fetchHostListings({ limit: 50 });
      setListings(data.items);
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

  const handleStatusChange = async (listingId: string, status: Listing['status']) => {
    try {
      await updateListingStatus(listingId, status);
      toast.success('Статус обновлён');
      await loadListings();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Удалить объявление? Это действие нельзя отменить.')) return;
    try {
      await deleteListing(listingId);
      toast.success('Объявление удалено');
      await loadListings();
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
            <Button onClick={() => router.push('/host/listings/new')}>Добавить объявление</Button>
          </header>

          {loading ? (
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-3xl" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Пока нет объявлений</h2>
              <p className="mt-2 text-sm text-slate-500">Добавьте первое размещение и откройте его для гостей.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {listings.map((listing) => (
                <article key={listing.id} className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{listing.title}</h2>
                      <p className="text-xs text-slate-500">{listing.city}, {listing.country}</p>
                    </div>
                    <Button variant="ghost" onClick={() => router.push(`/host/listings/${listing.id}/edit`)}>
                      Редактировать
                    </Button>
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
                    <Button variant="ghost" onClick={() => router.push(`/host/listings/${listing.id}/availability`)}>
                      Доступность
                    </Button>
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
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
