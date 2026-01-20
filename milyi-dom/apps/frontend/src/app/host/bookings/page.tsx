"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { fetchHostBookings, updateBookingStatus } from '../../../services/bookings';
import type { Booking } from '../../../types/api';
import { parseError } from '../../../lib/api-client';

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchHostBookings({ limit: 50 });
      setBookings(data.items);
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
      await loadBookings();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
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
            <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Пока нет бронирований от гостей</h2>
              <p className="mt-2 text-sm text-slate-500">Как только появятся новые заявки, они появятся здесь.</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {bookings.map((booking) => (
                <article key={booking.id} className="rounded-3xl bg-white p-6 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{booking.listing.title}</h2>
                      <p className="text-xs text-slate-500">
                        {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">{booking.status}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span>Гостей: {booking.adults + booking.children}</span>
                    <span>Детей: {booking.children}</span>
                    <span>Питомцев: {booking.pets}</span>
                    <span>
                      Сумма: {Number(booking.totalPrice).toLocaleString('ru-RU', { style: 'currency', currency: booking.currency })}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => handleStatusChange(booking.id, 'CONFIRMED')}>
                      Подтвердить
                    </Button>
                    <Button variant="ghost" onClick={() => handleStatusChange(booking.id, 'COMPLETED')}>
                      Завершить
                    </Button>
                    <Button variant="ghost" className="text-rose-600" onClick={() => handleStatusChange(booking.id, 'CANCELLED')}>
                      Отменить
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
