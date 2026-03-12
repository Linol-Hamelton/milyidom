"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { fetchGuestBookings, cancelBooking } from '../../services/bookings';
import { createDispute } from '../../services/disputes';
import type { Booking } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { decimalToNumber } from '../../lib/format';
import { useAuth } from '../../hooks/useAuth';

const STATUS_CONFIG: Record<Booking['status'], { label: string; color: string; bgColor: string }> = {
  PENDING: { 
    label: 'Ожидает подтверждения', 
    color: 'text-yellow-800', 
    bgColor: 'bg-yellow-100' 
  },
  CONFIRMED: { 
    label: 'Подтверждено', 
    color: 'text-green-800', 
    bgColor: 'bg-green-100' 
  },
  CANCELLED: { 
    label: 'Отменено', 
    color: 'text-red-800', 
    bgColor: 'bg-red-100' 
  },
  COMPLETED: { 
    label: 'Завершено', 
    color: 'text-blue-800', 
    bgColor: 'bg-blue-100' 
  },
};

export default function BookingsPage() {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | Booking['status']>('all');
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeSubject, setDisputeSubject] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSaving, setDisputeSaving] = useState(false);
  const router = useRouter();
  const limit = 6;

  const loadBookings = useCallback(
    async (nextPage = 1) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const data = await fetchGuestBookings({ page: nextPage, limit });
        setBookings(data.items);
        setTotal(data.meta.total);
        setPage(data.meta.page);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, limit],
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (id: string) => {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;

    // Optimistic update
    const snapshot = bookings;
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' as const } : b)),
    );

    try {
      await cancelBooking(id);
      toast.success('Бронирование отменено');
      await loadBookings(page);
    } catch (error) {
      setBookings(snapshot);
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const filteredBookings = activeFilter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === activeFilter);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const handleOpenDispute = async () => {
    if (!disputeBookingId) return;
    if (!disputeSubject.trim() || !disputeDescription.trim()) {
      toast.error('Заполните тему и описание спора');
      return;
    }
    setDisputeSaving(true);
    try {
      await createDispute({ bookingId: disputeBookingId, subject: disputeSubject, description: disputeDescription });
      toast.success('Спор открыт. Администратор рассмотрит его в ближайшее время.');
      setDisputeBookingId(null);
      setDisputeSubject('');
      setDisputeDescription('');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setDisputeSaving(false);
    }
  };

  const getDaysUntilTrip = (checkIn: string) => {
    const today = new Date();
    const checkInDate = new Date(checkIn);
    const diffTime = checkInDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">Мои поездки</h1>
            <p className="mt-2 text-gray-600">
              Управляйте бронированиями и планируйте следующие путешествия
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Все ({bookings.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <button
                key={status}
                onClick={() => setActiveFilter(status as Booking['status'])}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeFilter === status
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {config.label} ({bookings.filter(b => b.status === status).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="mx-auto max-w-md">
                <div className="text-6xl mb-4">✈️</div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeFilter === 'all' ? 'У вас пока нет поездок' : 'Нет поездок с таким статусом'}
                </h2>
                <p className="mt-2 text-gray-600">
                  {activeFilter === 'all' 
                    ? 'Начните планировать следующее путешествие и откройте для себя уникальные места для отдыха.'
                    : 'Пока нет бронирований с выбранным статусом.'
                  }
                </p>
                {activeFilter === 'all' && (
                  <Button 
                    onClick={() => router.push('/listings')}
                    className="mt-4 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
                  >
                    Найти жильё
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredBookings.map((booking) => {
                  const statusConfig = STATUS_CONFIG[booking.status];
                  const daysUntilTrip = getDaysUntilTrip(booking.checkIn);
                  
                  return (
                    <div key={booking.id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <Link href={`/bookings/${booking.id}`} className="font-semibold text-gray-900 text-lg hover:underline">
                            {booking.listing.title}
                          </Link>
                          <p className="text-gray-600 text-sm">{booking.listing.city}, {booking.listing.country}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="font-medium text-gray-900">Заезд</p>
                          <p className="text-gray-600">{new Date(booking.checkIn).toLocaleDateString('ru-RU')}</p>
                          {daysUntilTrip > 0 && daysUntilTrip <= 30 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Через {daysUntilTrip} {daysUntilTrip === 1 ? 'день' : daysUntilTrip < 5 ? 'дня' : 'дней'}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Выезд</p>
                          <p className="text-gray-600">{new Date(booking.checkOut).toLocaleDateString('ru-RU')}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm mb-4">
                        <div>
                          <p className="font-medium text-gray-900">Гости</p>
                          <p className="text-gray-600">
                            {booking.adults + booking.children} {booking.adults + booking.children === 1 ? 'гость' : booking.adults + booking.children < 5 ? 'гостя' : 'гостей'}
                            {booking.children > 0 && `, ${booking.children} ${booking.children === 1 ? 'ребёнок' : booking.children < 5 ? 'ребёнка' : 'детей'}`}
                            {booking.pets > 0 && `, ${booking.pets} ${booking.pets === 1 ? 'питомец' : booking.pets < 5 ? 'питомца' : 'питомцев'}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">Стоимость</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {decimalToNumber(booking.totalPrice).toLocaleString('ru-RU', {
                              style: 'currency',
                              currency: booking.currency,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(booking.id)}
                          >
                            Отменить
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                        >
                          Посмотреть
                        </Button>
                        {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setDisputeBookingId(booking.id); setDisputeSubject(''); setDisputeDescription(''); }}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Открыть спор
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Показано {bookings.length} из {total} поездок
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page <= 1} 
                      onClick={() => loadBookings(page - 1)}
                    >
                      Назад
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page >= totalPages} 
                      onClick={() => loadBookings(page + 1)}
                    >
                      Далее
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Open dispute modal */}
      {disputeBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Открыть спор</h2>
            <p className="mb-4 text-sm text-gray-500">
              Опишите проблему. Администратор рассмотрит её в ближайшее время.
            </p>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Тема</label>
              <input
                type="text"
                value={disputeSubject}
                onChange={(e) => setDisputeSubject(e.target.value)}
                placeholder="Краткое описание проблемы"
                maxLength={200}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700">Описание</label>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Подробно опишите ситуацию (минимум 20 символов)"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDisputeBookingId(null)} disabled={disputeSaving}>
                Отмена
              </Button>
              <Button
                onClick={handleOpenDispute}
                disabled={disputeSaving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {disputeSaving ? 'Отправка...' : 'Открыть спор'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </RequireAuth>
  );
}
