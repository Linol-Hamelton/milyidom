"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const popularCities = [
  { name: 'Москва', emoji: '🏙️' },
  { name: 'Санкт-Петербург', emoji: '🌉' },
  { name: 'Сочи', emoji: '🌴' },
  { name: 'Казань', emoji: '🕌' },
  { name: 'Краснодар', emoji: '🌻' },
  { name: 'Калининград', emoji: '⚓' },
];

export default function Hero() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('city', location.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    const qs = params.toString();
    router.push(qs ? `/listings?${qs}` : '/listings');
  };

  const handleCityShortcut = (city: string) => {
    router.push(`/listings?city=${encodeURIComponent(city)}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Rich dark-green gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pine-900 via-pine-700 to-pine-500" />
      {/* Decorative blur shapes */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 right-8 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-pine-300/20 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
            Найдите идеальный дом
            <span className="mt-1 block text-amber-200">для следующей поездки</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-pine-100">
            Уютные квартиры, дизайнерские лофты и просторные дома — бронируйте напрямую у проверенных хостов.
          </p>
        </div>

        {/* Search form */}
        <div className="mx-auto mt-10 max-w-4xl">
          <form onSubmit={handleSearch} className="overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Локация
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Город или направление"
                  className="w-full border-0 p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Заезд
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Выезд
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full border-0 p-0 text-sm text-gray-900 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Гостей
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-pine-500 hover:text-pine-600"
                        aria-label="Уменьшить количество гостей"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-4 text-center text-sm font-medium text-gray-900">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests(guests + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-pine-500 hover:text-pine-600"
                        aria-label="Увеличить количество гостей"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-pine-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-pine-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Найти
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* City shortcuts */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {popularCities.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => handleCityShortcut(city.name)}
              className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/25"
            >
              <span>{city.emoji}</span>
              <span>{city.name}</span>
            </button>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-pine-100">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Проверенные хосты
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Поддержка 24/7
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Без скрытых комиссий
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
