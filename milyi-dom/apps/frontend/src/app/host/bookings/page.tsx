"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { Pagination } from '../../../components/ui/pagination';
import { fetchHostBookings, updateBookingStatus } from '../../../services/bookings';
import type { Booking } from '../../../types/api';
import { parseError } from '../../../lib/api-client';
import { decimalToNumber } from '../../../lib/format';
import EmptyState from '../../../components/ui/empty-state';

const STATUS_RU: Record<string, string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const statusColor: Record<string, string> = {
  PENDING: 'text-amber-600 bg-amber-50',
  CONFIRMED: 'text-emerald-700 bg-emerald-50',
  CANCELLED: 'text-rose-600 bg-rose-50',
  COMPLETED: 'text-slate-600 bg-slate-100',
};

const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function HostBookingsPage() {
  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
      <HostBookingsContent />
    </RequireAuth>
  );
}

const PAGE_LIMIT = 10;

function HostBookingsContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadBookings = async (nextPage = 1) => {
    setLoading(true);
    try {
      const data = await fetchHostBookings({ page: nextPage, limit: PAGE_LIMIT });
      setBookings(data.items);
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
    loadBookings();
  }, []);

  const handleStatusChange = async (bookingId: string, status: Booking['status']) => {
    try {
      await updateBookingStatus(bookingId, status);
      toast.success('Статус бронирования обновлён');
      await loadBookings(page);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_LIMIT), 1);

  return (
    <div className="bg-sand-50 py-12">
      <div className="mx-auto max-w-content-2xl px-4 sm:px-6 lg:px-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-pine-600">Бронирования гостей</p>
          <h1 className="text-3xl font-serif text-slate-900">Контролируйте заезды и статусы</h1>
          <p className="text-sm text-slate-600">
            Подтверждайте заявки, отмечайте заселения и закрывайте поездки, когда гости выехали.
          </p>
        </header>

        {loading ? (
          <div className="mt-10 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-3xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            emoji="📋"
            title="Пока нет бронирований от гостей"
            description="Как только появятся новые заявки, они появятся здесь."
            className="mt-12"
          />
        ) : (
          <div className="mt-10 space-y-4" data-testid="bookings-list">
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-3xl bg-white p-6 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{booking.listing.title}</h2>
                    <p className="text-xs text-slate-500">
                      {fmt.format(new Date(booking.checkIn))} — {fmt.format(new Date(booking.checkOut))}
                    </p>
                    {booking.guest && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Гость: {booking.guest.profile?.firstName ?? booking.guest.email}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[booking.status] ?? 'text-slate-600 bg-slate-100'}`}
                  >
                    {STATUS_RU[booking.status] ?? booking.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span>Взрослых: {booking.adults}</span>
                  {booking.children > 0 && <span>Детей: {booking.children}</span>}
                  {booking.pets > 0 && <span>Питомцев: {booking.pets}</span>}
                  <span className="font-medium text-slate-800">
                    {decimalToNumber(booking.totalPrice).toLocaleString('ru-RU', { style: 'currency', currency: booking.currency, maximumFractionDigits: 0 })}
                  </span>
                </div>
                {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {booking.status === 'PENDING' && (
                      <Button size="sm" onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}>
                        Подтвердить
                      </Button>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(booking.id, 'COMPLETED')}>
                        Завершить
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => handleStatusChange(booking.id, 'CANCELLED')}
                    >
                      Отменить
                    </Button>
                  </div>
                )}
              </article>
            ))}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              itemCount={bookings.length}
              itemLabel="бронирований"
              loading={loading}
              onPrev={() => loadBookings(page - 1)}
              onNext={() => loadBookings(page + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
