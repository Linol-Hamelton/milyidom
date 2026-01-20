"use client";

import { useState } from 'react';

export default function Hero() {
  const [guests, setGuests] = useState(2);

  return (
    <section className="relative bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-rose-50" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Найдите идеальный дом
            <span className="block text-blue-600">для своей следующей поездки</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
            Уютные квартиры, дизайнерские лофты и просторные дома — бронируйте напрямую у проверенных хостов.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl">
          <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
            <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Локация
                </label>
                <input
                  type="text"
                  placeholder="Город или направление"
                  className="w-full border-0 p-0 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Заезд
                </label>
                <input
                  type="date"
                  className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Выезд
                </label>
                <input
                  type="date"
                  className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Гостей
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuests(Math.max(1, guests - 1))}
                        className="rounded-full p-1 hover:bg-gray-100"
                        aria-label="Уменьшить количество гостей"
                      >
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-900">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests(guests + 1)}
                        className="rounded-full p-1 hover:bg-gray-100"
                        aria-label="Увеличить количество гостей"
                      >
                        <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-white transition-colors hover:bg-rose-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm font-medium">Найти жильё</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Проверенные хосты
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Поддержка 24/7
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
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
