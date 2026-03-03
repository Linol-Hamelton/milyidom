"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CalendarDaysIcon, UserGroupIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { RequireAuth } from '../../../components/ui/require-auth';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { fetchBooking, cancelBooking } from '../../../services/bookings';
import { parseError } from '../../../lib/api-client';
import { decimalToNumber } from '../../../lib/format';
import type { Booking } from '../../../types/api';

const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Ожидает подтверждения',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const STATUS_COLOR: Record<Booking['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-800 border-green-200',
  CANCELLED: 'bg-red-50 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-800 border-blue-200',
};

function nights(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBooking(id);
      setBooking(data);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const handleCancel = async () => {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
    setCancelling(true);
    try {
      await cancelBooking(id);
      toast.success('Бронирование отменено');
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <div className="min-h-screen bg-sand-50">
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
            <Skeleton className="mb-6 h-8 w-48 rounded-xl" />
            <Skeleton className="h-72 rounded-3xl" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-12 rounded-2xl" />
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (!booking) return null;

  const n = nights(booking.checkIn, booking.checkOut);
  const thumb = booking.listing.images?.[0]?.url;
  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const host = booking.listing.host;
  const hostName =
    host.profile?.firstName
      ? `${host.profile.firstName}${host.profile.lastName ? ' ' + host.profile.lastName : ''}`
      : host.email;

  return (
    <RequireAuth>
      <div className="min-h-screen bg-sand-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          {/* Back */}
          <Link
            href="/bookings"
            className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Мои поездки
          </Link>

          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Бронирование
              </p>
              <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900 leading-tight">
                {booking.listing.title}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {booking.listing.city}, {booking.listing.country}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[booking.status]}`}
            >
              {STATUS_LABEL[booking.status]}
            </span>
          </div>

          {/* Listing thumbnail */}
          {thumb && (
            <div className="relative mb-4 h-52 w-full overflow-hidden rounded-3xl">
              <Image src={thumb} alt={booking.listing.title} fill className="object-cover" unoptimized />
            </div>
          )}

          {/* Details card */}
          <div className="rounded-3xl bg-white p-6 shadow-soft space-y-5">
            {/* Dates */}
            <div className="flex gap-6">
              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
                <div>
                  <p className="text-xs text-slate-400">Заезд</p>
                  <p className="font-medium text-slate-800">
                    {new Date(booking.checkIn).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDaysIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Выезд</p>
                  <p className="font-medium text-slate-800">
                    {new Date(booking.checkOut).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-start gap-3 border-t border-sand-100 pt-4">
              <UserGroupIcon className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
              <div>
                <p className="text-xs text-slate-400">Гости</p>
                <p className="font-medium text-slate-800">
                  {booking.adults} {booking.adults === 1 ? 'взрослый' : booking.adults < 5 ? 'взрослых' : 'взрослых'}
                  {booking.children > 0 && `, ${booking.children} ${booking.children === 1 ? 'ребёнок' : 'детей'}`}
                  {booking.infants > 0 && `, ${booking.infants} ${booking.infants === 1 ? 'младенец' : 'младенцев'}`}
                  {booking.pets > 0 && `, ${booking.pets} ${booking.pets === 1 ? 'питомец' : 'питомцев'}`}
                </p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-sand-100 pt-4">
              <div className="flex items-start gap-3">
                <CurrencyRupeeIcon className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-2">Стоимость</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {decimalToNumber(booking.listing.basePrice).toLocaleString('ru-RU')} ₽ × {n}{' '}
                        {n === 1 ? 'ночь' : n < 5 ? 'ночи' : 'ночей'}
                      </span>
                      <span>
                        {(decimalToNumber(booking.listing.basePrice) * n).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    {booking.listing.cleaningFee && decimalToNumber(booking.listing.cleaningFee) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Уборка</span>
                        <span>{decimalToNumber(booking.listing.cleaningFee).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    {booking.listing.serviceFee && decimalToNumber(booking.listing.serviceFee) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Сервисный сбор</span>
                        <span>{decimalToNumber(booking.listing.serviceFee).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-sand-200 pt-2 font-semibold text-slate-900">
                      <span>Итого</span>
                      <span>
                        {decimalToNumber(booking.totalPrice).toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: booking.currency,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Host info */}
            <div className="border-t border-sand-100 pt-4 flex items-center gap-3">
              {host.profile?.avatarUrl ? (
                <Image
                  src={host.profile.avatarUrl}
                  alt={hostName}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-100 text-sm font-medium text-pine-700">
                  {hostName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400">Хозяин</p>
                <p className="text-sm font-medium text-slate-800">{hostName}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/listings/${booking.listing.id}`)}
              className="flex-1"
            >
              Посмотреть объявление
            </Button>
            {canCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
              >
                {cancelling ? 'Отмена…' : 'Отменить бронирование'}
              </Button>
            )}
          </div>

          {/* Booking ID */}
          <p className="mt-4 text-center text-xs text-slate-400">
            ID бронирования: {booking.id}
          </p>
        </div>
      </div>
    </RequireAuth>
  );
}
