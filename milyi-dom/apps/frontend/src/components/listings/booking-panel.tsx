'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Listing } from '../../types/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { createBooking } from '../../services/bookings';
import { checkAvailability } from '../../services/listings';
import toast from 'react-hot-toast';
import { nightsBetween, formatCurrency } from '../../lib/format';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

interface BookingPanelProps {
  listing: Listing;
}

interface AvailabilityResponse {
  available: boolean;
  conflictingBookings?: Array<{
    checkIn: string;
    checkOut: string;
  }>;
}

function pluralNights(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} ночей`;
  if (mod10 === 1) return `${n} ночь`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ночи`;
  return `${n} ночей`;
}

export function BookingPanel({ listing }: BookingPanelProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

  const basePrice = Number(listing.basePrice || 0);
  const feeCleaning = Number(listing.cleaningFee || 0);
  const feeService = Number(listing.serviceFee || 0);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = nights * basePrice + feeCleaning + feeService;

  // Check availability when dates change (debounced)
  useEffect(() => {
    const validateDates = async () => {
      if (!checkIn || !checkOut || nights <= 0) {
        setAvailability(null);
        return;
      }
      setCheckingAvailability(true);
      try {
        const result = await checkAvailability(listing.id, checkIn, checkOut);
        setAvailability(result);
      } catch {
        setAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    };

    const id = setTimeout(validateDates, 500);
    return () => clearTimeout(id);
  }, [checkIn, checkOut, listing.id, nights]);

  const validateMinimumStay = () =>
    !checkIn || !checkOut || nights >= (listing.minNights || 1);

  const validateMaximumStay = () =>
    !checkIn || !checkOut || nights <= (listing.maxNights || 365);

  const validateGuests = () => {
    const total = adults + children;
    return total <= (listing.guests || 10) && total > 0;
  };

  const isFormValid = () =>
    Boolean(checkIn) &&
    Boolean(checkOut) &&
    nights > 0 &&
    validateMinimumStay() &&
    validateMaximumStay() &&
    validateGuests() &&
    availability?.available !== false;

  const getFirstError = (): string | null => {
    if (!checkIn || !checkOut) return 'Выберите даты заезда и выезда';
    if (nights <= 0) return 'Дата выезда должна быть позже даты заезда';
    if (!validateMinimumStay())
      return `Минимальный срок проживания: ${pluralNights(listing.minNights || 1)}`;
    if (!validateMaximumStay())
      return `Максимальный срок проживания: ${pluralNights(listing.maxNights || 365)}`;
    if (!validateGuests())
      return `Максимум ${listing.guests || 10} гостей`;
    if (availability?.available === false) return 'Выбранные даты недоступны';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error('Войдите в аккаунт, чтобы забронировать жильё.');
      router.push('/auth/login');
      return;
    }

    const error = getFirstError();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        listingId: listing.id,
        checkIn,
        checkOut,
        adults,
        children,
        infants,
        pets,
      });

      toast.success(
        listing.instantBook ? 'Бронирование подтверждено!' : 'Запрос на бронирование отправлен!',
      );

      // Redirect to Stripe checkout page
      router.push(`/payments/${booking.id}`);
    } catch (err) {
      const { message } = parseError(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getMinCheckOut = () => {
    if (!checkIn) return '';
    const d = new Date(checkIn);
    d.setDate(d.getDate() + (listing.minNights || 1));
    return d.toISOString().split('T')[0];
  };

  const getMaxCheckOut = () => {
    if (!checkIn) return '';
    const d = new Date(checkIn);
    d.setDate(d.getDate() + (listing.maxNights || 365));
    return d.toISOString().split('T')[0];
  };

  return (
    <aside className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      {/* Price header */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">
          {formatCurrency(basePrice, listing.currency)}
        </span>
        <span className="text-sm text-slate-500">/ ночь</span>
      </div>
      {listing.rating && (
        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <span className="text-amber-500">★</span>
          <span>{listing.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{listing.reviewCount} отзывов</span>
        </div>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        {/* Date inputs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Заезд
            <Input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Выезд
            <Input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={getMinCheckOut()}
              max={getMaxCheckOut()}
            />
          </label>
        </div>

        {/* Availability badge */}
        {checkingAvailability && (
          <p className="text-xs text-slate-400">Проверяем доступность…</p>
        )}
        {!checkingAvailability && availability && (
          <p
            className={`text-xs font-medium ${
              availability.available ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {availability.available ? '✓ Даты свободны' : '✗ Даты недоступны'}
          </p>
        )}

        {/* Guest counts */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Взрослые', value: adults, set: setAdults, min: 1 },
            { label: 'Дети', value: children, set: setChildren, min: 0 },
            { label: 'Младенцы', value: infants, set: setInfants, min: 0 },
            { label: 'Питомцы', value: pets, set: setPets, min: 0 },
          ].map(({ label, value, set, min }) => (
            <label
              key={label}
              className="flex flex-col gap-1.5 text-sm font-medium text-slate-700"
            >
              {label}
              <Input
                type="number"
                min={min}
                max={listing.guests}
                value={value}
                onChange={(e) => set(Number(e.target.value))}
              />
            </label>
          ))}
        </div>

        {/* Price breakdown */}
        {nights > 0 && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span>
                {formatCurrency(basePrice, listing.currency)} × {pluralNights(nights)}
              </span>
              <span>{formatCurrency(nights * basePrice, listing.currency)}</span>
            </div>
            {feeCleaning > 0 && (
              <div className="flex justify-between">
                <span>Уборка</span>
                <span>{formatCurrency(feeCleaning, listing.currency)}</span>
              </div>
            )}
            {feeService > 0 && (
              <div className="flex justify-between">
                <span>Сервисный сбор</span>
                <span>{formatCurrency(feeService, listing.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
              <span>Итого</span>
              <span>{formatCurrency(subtotal, listing.currency)}</span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
          isLoading={loading}
          disabled={!isFormValid() || checkingAvailability || loading}
        >
          {!checkIn || !checkOut
            ? 'Выберите даты'
            : loading
            ? 'Оформляем бронирование…'
            : listing.instantBook
            ? 'Забронировать сейчас'
            : 'Отправить запрос'}
        </Button>

        <p className="text-center text-xs text-slate-400">
          {listing.instantBook
            ? 'Оплата — на следующем шаге, сейчас деньги не списываются'
            : 'Оплата произойдёт только после подтверждения хостом'}
        </p>
      </form>
    </aside>
  );
}
