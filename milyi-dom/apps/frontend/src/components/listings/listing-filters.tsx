'use client';

import { useEffect, useState } from 'react';
import type { Amenity, ListingSearchFilters } from '../../types/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Card, CardContent, CardHeader } from '../ui/card';
import { CityAutocomplete } from '../ui/city-autocomplete';

interface ListingFiltersProps {
  amenities: Amenity[];
  onApply: (filters: ListingSearchFilters) => void;
  initialFilters?: ListingSearchFilters;
}

const propertyTypes = [
  { value: 'apartment', label: 'Квартира' },
  { value: 'loft', label: 'Лофт' },
  { value: 'house', label: 'Дом' },
  { value: 'villa', label: 'Вилла' },
  { value: 'studio', label: 'Студия' },
];

const sortOptions = [
  { value: undefined, label: 'По умолчанию' },
  { value: 'price_low', label: 'Цена: по возрастанию' },
  { value: 'price_high', label: 'Цена: по убыванию' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'new', label: 'Сначала новые' },
];

export function ListingFilters({ amenities, onApply, initialFilters }: ListingFiltersProps) {
  const [filters, setFilters] = useState<ListingSearchFilters>({ guests: 1, ...initialFilters });

  useEffect(() => {
    if (initialFilters) {
      setFilters((prev) => ({ ...prev, ...initialFilters }));
    }
  }, [initialFilters]);

  const handleChange = <K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (id: number) => {
    setFilters((prev) => {
      const set = new Set(prev.amenities ?? []);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return { ...prev, amenities: Array.from(set) };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(filters);
  };

  const handleReset = () => {
    const resetFilters: ListingSearchFilters = { guests: 1 };
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  return (
    <Card className="bg-white/90">
      <CardHeader className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Фильтры</h2>
        <p className="text-sm text-slate-500">Уточните направление, бюджет и уровень комфорта.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CityAutocomplete
              label="Город"
              value={filters.city ?? ''}
              onChange={(value) => handleChange('city', value || undefined)}
              placeholder="Москва, Санкт-Петербург…"
            />
            <FilterInput
              label="Страна"
              value={filters.country ?? ''}
              onChange={(value) => handleChange('country', value || undefined)}
              placeholder="Россия"
            />
            <FilterNumber
              label="Гостей"
              value={filters.guests ?? 1}
              min={1}
              onChange={(value) => handleChange('guests', value || 1)}
            />
            <FilterInput
              label="Дата заезда"
              type="date"
              value={filters.checkIn ?? ''}
              onChange={(value) => handleChange('checkIn', value || undefined)}
            />
            <FilterInput
              label="Дата выезда"
              type="date"
              value={filters.checkOut ?? ''}
              onChange={(value) => handleChange('checkOut', value || undefined)}
            />
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Тип жилья
              <Select
                value={filters.propertyType ?? ''}
                onChange={(event) => handleChange('propertyType', event.target.value || undefined)}
              >
                <option value="">Любой</option>
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </label>
            <FilterNumber
              label="Цена от"
              value={filters.minPrice ?? 0}
              min={0}
              onChange={(value) => handleChange('minPrice', value || undefined)}
            />
            <FilterNumber
              label="Цена до"
              value={filters.maxPrice ?? 0}
              min={0}
              onChange={(value) => handleChange('maxPrice', value || undefined)}
            />
            <FilterNumber
              label="Рейтинг от"
              value={filters.minRating ?? 0}
              min={1}
              max={5}
              step={0.1}
              onChange={(value) => handleChange('minRating', value || undefined)}
            />
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Сортировка
              <Select
                value={filters.sort ?? ''}
                onChange={(event) =>
                  handleChange('sort', (event.target.value || undefined) as ListingSearchFilters['sort'])
                }
              >
                {sortOptions.map((option) => (
                  <option key={option.label} value={option.value ?? ''}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(filters.instantBook)}
                onChange={(event) => handleChange('instantBook', event.target.checked || undefined)}
                className="h-4 w-4 rounded border-slate-300 text-pine-600 focus:ring-pine-500"
              />
              Только мгновенное бронирование
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-700">Удобства</span>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {amenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-pine-600 focus:ring-pine-500"
                    checked={filters.amenities?.includes(amenity.id) ?? false}
                    onChange={() => toggleAmenity(amenity.id)}
                  />
                  <span>{amenity.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleReset}>
              Сбросить
            </Button>
            <Button type="submit">Применить</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FilterNumber({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      <Input
        type="number"
        value={value || ''}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : 0)}
      />
    </label>
  );
}
