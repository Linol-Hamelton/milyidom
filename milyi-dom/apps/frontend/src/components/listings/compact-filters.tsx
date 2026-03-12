'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Amenity, ListingSearchFilters } from '../../types/api';
import { CityAutocomplete } from '../ui/city-autocomplete';
import { DateRangePicker } from '../ui/date-range-picker';

interface CompactFiltersProps {
  amenities: Amenity[];
  initialFilters: ListingSearchFilters;
  onApply: (filters: ListingSearchFilters) => void;
}

const propertyTypes = [
  { value: '', label: 'Любой тип' },
  { value: 'apartment', label: '🏢 Квартира' },
  { value: 'studio', label: '🛋️ Студия' },
  { value: 'loft', label: '🏭 Лофт' },
  { value: 'house', label: '🏡 Дом' },
  { value: 'villa', label: '🏰 Вилла' },
];

const sortOptions = [
  { value: '', label: 'По умолчанию' },
  { value: 'price_low', label: '↑ Цена' },
  { value: 'price_high', label: '↓ Цена' },
  { value: 'rating', label: '★ Рейтинг' },
  { value: 'new', label: '🆕 Новые' },
];

export function CompactFilters({ amenities, initialFilters, onApply }: CompactFiltersProps) {
  const [filters, setFilters] = useState<ListingSearchFilters>(initialFilters);
  const [showModal, setShowModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ListingSearchFilters>(initialFilters);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilters(initialFilters);
    setAdvancedFilters(initialFilters);
  }, [initialFilters]);

  // Close modal on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showModal && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModal]);

  const handleChange = <K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onApply({ ...next, page: 1 });
  };

  const handleAdvancedChange = <K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) => {
    setAdvancedFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (id: number) => {
    setAdvancedFilters((prev) => {
      const set = new Set(prev.amenities ?? []);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...prev, amenities: Array.from(set) };
    });
  };

  const [priceError, setPriceError] = useState<string | null>(null);

  const applyAdvanced = () => {
    const { minPrice, maxPrice } = advancedFilters;
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      setPriceError('Минимальная цена не может быть больше максимальной');
      return;
    }
    setPriceError(null);
    const next = { ...filters, ...advancedFilters, page: 1 };
    setFilters(next);
    onApply(next);
    setShowModal(false);
  };

  const resetAdvanced = () => {
    const cleared: ListingSearchFilters = {
      ...filters,
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      amenities: [],
      instantBook: undefined,
    };
    setAdvancedFilters(cleared);
    setFilters(cleared);
    onApply({ ...cleared, page: 1 });
    setShowModal(false);
  };

  // Count active advanced filters
  const advancedCount = [
    advancedFilters.minPrice,
    advancedFilters.maxPrice,
    advancedFilters.minRating,
    advancedFilters.instantBook,
    ...(advancedFilters.amenities ?? []),
  ].filter(Boolean).length;

  return (
    <div className="relative">
      {/* ── Compact filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">

        {/* City */}
        <div className="min-w-[160px] flex-1">
          <CityAutocomplete
            label=""
            value={filters.city ?? ''}
            onChange={(v) => handleChange('city', v || undefined)}
            placeholder="📍 Город"
          />
        </div>

        <div className="h-6 w-px bg-slate-200 max-sm:hidden" />

        {/* Date range picker */}
        <DateRangePicker
          checkIn={filters.checkIn}
          checkOut={filters.checkOut}
          onChange={(ci, co) => {
            const next = { ...filters, checkIn: ci, checkOut: co };
            setFilters(next);
            onApply({ ...next, page: 1 });
          }}
          variant="columns"
        />

        <div className="h-6 w-px bg-slate-200 max-sm:hidden" />

        {/* Guests */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-500">👥</span>
          <button
            type="button"
            onClick={() => handleChange('guests', Math.max(1, (filters.guests ?? 1) - 1))}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-pine-400 hover:text-pine-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <span className="w-5 text-center text-sm font-medium text-slate-800">{filters.guests ?? 1}</span>
          <button
            type="button"
            onClick={() => handleChange('guests', (filters.guests ?? 1) + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-pine-400 hover:text-pine-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 max-sm:hidden" />

        {/* Property type */}
        <select
          value={filters.propertyType ?? ''}
          onChange={(e) => handleChange('propertyType', e.target.value || undefined)}
          className="border-0 bg-transparent text-sm text-slate-700 focus:outline-none focus:ring-0"
        >
          {propertyTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="h-6 w-px bg-slate-200 max-sm:hidden" />

        {/* Sort */}
        <select
          value={filters.sort ?? ''}
          onChange={(e) => handleChange('sort', (e.target.value || undefined) as ListingSearchFilters['sort'])}
          className="border-0 bg-transparent text-sm text-slate-700 focus:outline-none focus:ring-0"
        >
          {sortOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          {/* Reset */}
          {(filters.city || filters.checkIn || filters.checkOut || (filters.guests ?? 1) > 1 || filters.propertyType || filters.sort || advancedCount > 0) && (
            <button
              type="button"
              onClick={() => {
                const reset: ListingSearchFilters = { guests: 1, limit: filters.limit, page: 1 };
                setFilters(reset);
                setAdvancedFilters(reset);
                onApply(reset);
              }}
              className="text-sm text-slate-400 transition hover:text-slate-600"
            >
              Сбросить
            </button>
          )}

          {/* Advanced filters button */}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition',
              advancedCount > 0
                ? 'border-pine-500 bg-pine-50 text-pine-700'
                : 'border-slate-200 text-slate-600 hover:border-pine-400 hover:text-pine-600',
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591L15.25 12.75a2.25 2.25 0 00-.659 1.591V19l-4.5 2.25V14.341a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Фильтры
            {advancedCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pine-600 text-xs font-semibold text-white">
                {advancedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Advanced filters modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div
            ref={modalRef}
            className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Дополнительные фильтры</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Price range slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Цена за ночь (₽)</p>
                  <span className="text-xs text-slate-500">
                    {advancedFilters.minPrice
                      ? `${advancedFilters.minPrice.toLocaleString('ru')}₽`
                      : '0₽'}{' '}
                    —{' '}
                    {advancedFilters.maxPrice
                      ? `${advancedFilters.maxPrice.toLocaleString('ru')}₽`
                      : 'любая'}
                  </span>
                </div>

                {/* Preset buttons */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {([
                    { label: 'до 3к', min: undefined, max: 3000 },
                    { label: '3–8к', min: 3000, max: 8000 },
                    { label: '8–15к', min: 8000, max: 15000 },
                    { label: '15к+', min: 15000, max: undefined },
                  ] as { label: string; min: number | undefined; max: number | undefined }[]).map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setAdvancedFilters((prev) => ({ ...prev, minPrice: p.min, maxPrice: p.max }))
                      }
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        advancedFilters.minPrice === p.min && advancedFilters.maxPrice === p.max
                          ? 'border-pine-500 bg-pine-50 text-pine-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Sliders */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-slate-400">От</span>
                    <input
                      type="range"
                      min={0}
                      max={50000}
                      step={500}
                      value={advancedFilters.minPrice ?? 0}
                      onChange={(e) =>
                        handleAdvancedChange('minPrice', Number(e.target.value) || undefined)
                      }
                      className="w-full accent-pine-600"
                    />
                    <span className="w-14 shrink-0 text-right text-xs text-slate-600">
                      {(advancedFilters.minPrice ?? 0).toLocaleString('ru')}₽
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-slate-400">До</span>
                    <input
                      type="range"
                      min={0}
                      max={50000}
                      step={500}
                      value={advancedFilters.maxPrice ?? 50000}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        handleAdvancedChange('maxPrice', v >= 50000 ? undefined : v);
                      }}
                      className="w-full accent-pine-600"
                    />
                    <span className="w-14 shrink-0 text-right text-xs text-slate-600">
                      {advancedFilters.maxPrice
                        ? `${advancedFilters.maxPrice.toLocaleString('ru')}₽`
                        : 'любая'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Min rating */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Минимальный рейтинг</p>
                <div className="flex gap-2">
                  {[4, 4.5, 4.8].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleAdvancedChange('minRating', advancedFilters.minRating === r ? undefined : r)}
                      className={clsx(
                        'flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm font-medium transition',
                        advancedFilters.minRating === r
                          ? 'border-pine-500 bg-pine-50 text-pine-700'
                          : 'border-slate-200 text-slate-600 hover:border-pine-300',
                      )}
                    >
                      ★ {r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Instant book */}
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={Boolean(advancedFilters.instantBook)}
                    onChange={(e) => handleAdvancedChange('instantBook', e.target.checked || undefined)}
                    className="sr-only"
                  />
                  <div className={clsx(
                    'h-6 w-11 rounded-full transition-colors',
                    advancedFilters.instantBook ? 'bg-pine-600' : 'bg-slate-200',
                  )}>
                    <div className={clsx(
                      'mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                      advancedFilters.instantBook ? 'translate-x-5.5' : 'translate-x-0.5',
                    )} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Мгновенное бронирование</p>
                  <p className="text-xs text-slate-400">Заезжайте без ожидания подтверждения</p>
                </div>
              </label>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Удобства</p>
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((a) => {
                      const active = (advancedFilters.amenities ?? []).includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => toggleAmenity(a.id)}
                          className={clsx(
                            'rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                            active
                              ? 'border-pine-500 bg-pine-50 text-pine-700'
                              : 'border-slate-200 text-slate-600 hover:border-pine-300',
                          )}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              {priceError && (
                <p className="col-span-2 text-xs text-red-600">{priceError}</p>
              )}
              <button
                type="button"
                onClick={resetAdvanced}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Сбросить всё
              </button>
              <button
                type="button"
                onClick={applyAdvanced}
                className="flex-1 rounded-xl bg-pine-600 py-2.5 text-sm font-semibold text-white transition hover:bg-pine-500"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
