"use client";

import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { PricingSuggestionWidget } from '../ui/pricing-suggestion-widget';
import type { Amenity, Listing } from '../../types/api';

export type ListingFormValues = {
  title: string;
  summary: string;
  description: string;
  propertyType: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  cleaningFee?: number;
  serviceFee?: number;
  currency: string;
  instantBook: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  amenityIds: number[];
  images: string;
  uploadFiles: File[];
};

interface ListingFormProps {
  amenities: Amenity[];
  initialValues?: Listing;
  listingId?: string;
  onSubmit: (values: ListingFormValues) => Promise<void>;
  submitting?: boolean;
}

const defaultValues: ListingFormValues = {
  title: '',
  summary: '',
  description: '',
  propertyType: 'apartment',
  guests: 1,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  basePrice: 100,
  cleaningFee: undefined,
  serviceFee: undefined,
  currency: 'RUB',
  instantBook: false,
  addressLine1: '',
  addressLine2: undefined,
  city: '',
  state: undefined,
  country: 'Россия',
  postalCode: undefined,
  latitude: 0,
  longitude: 0,
  amenityIds: [],
  images: '',
  uploadFiles: [],
};

export function ListingForm({ amenities, initialValues, listingId, onSubmit, submitting }: ListingFormProps) {
  const [values, setValues] = useState<ListingFormValues>(() =>
    initialValues ? mapListingToForm(initialValues) : defaultValues,
  );

  useEffect(() => {
    if (initialValues) {
      setValues(mapListingToForm(initialValues));
    }
  }, [initialValues]);

  const selectedAmenities = useMemo(() => new Set(values.amenityIds), [values.amenityIds]);

  const handleChange = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (id: number) => {
    setValues((prev) => {
      const set = new Set(prev.amenityIds);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      return { ...prev, amenityIds: Array.from(set) };
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setValues((prev) => ({ ...prev, uploadFiles: [...prev.uploadFiles, ...files] }));
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setValues((prev) => ({
      ...prev,
      uploadFiles: prev.uploadFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Название объявления
          <Input value={values.title} onChange={(event) => handleChange('title', event.target.value)} required />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Тип жилья
          <select
            value={values.propertyType}
            onChange={(event) => handleChange('propertyType', event.target.value)}
            required
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
          >
            <option value="apartment">Квартира</option>
            <option value="house">Дом</option>
            <option value="villa">Вилла</option>
            <option value="loft">Лофт</option>
            <option value="studio">Студия</option>
          </select>
        </label>
        <label className="sm:col-span-2 flex flex-col gap-2 text-sm text-slate-600">
          Краткое описание
          <Input value={values.summary} onChange={(event) => handleChange('summary', event.target.value)} />
        </label>
        <label className="sm:col-span-2 flex flex-col gap-2 text-sm text-slate-600">
          Полное описание
          <Textarea
            rows={5}
            value={values.description}
            onChange={(event) => handleChange('description', event.target.value)}
            required
          />
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Гостей" value={values.guests} onChange={(val) => handleChange('guests', val)} min={1} />
        <NumberField label="Спален" value={values.bedrooms} onChange={(val) => handleChange('bedrooms', val)} min={0} />
        <NumberField label="Кроватей" value={values.beds} onChange={(val) => handleChange('beds', val)} min={0} />
        <NumberField
          label="Ванных (1.5 = санузел + ванна)"
          value={values.bathrooms}
          onChange={(val) => handleChange('bathrooms', val)}
          min={0}
          step={0.5}
        />
        <NumberField
          label="Базовая цена (за ночь)"
          value={values.basePrice}
          onChange={(val) => handleChange('basePrice', val)}
          min={0}
        />
        {listingId && (
          <div className="sm:col-span-2 lg:col-span-3">
            <PricingSuggestionWidget
              listingId={listingId}
              onApply={(price) => handleChange('basePrice', price)}
            />
          </div>
        )}
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Валюта
          <Input value={values.currency} onChange={(event) => handleChange('currency', event.target.value)} />
        </label>
        <NumberField
          label="Уборка (опционально)"
          value={values.cleaningFee ?? 0}
          onChange={(val) => handleChange('cleaningFee', val || undefined)}
          min={0}
        />
        <NumberField
          label="Сервисный сбор (опционально)"
          value={values.serviceFee ?? 0}
          onChange={(val) => handleChange('serviceFee', val || undefined)}
          min={0}
        />
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={values.instantBook}
            onChange={(event) => handleChange('instantBook', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-pine-600 focus:ring-pine-500"
          />
          Мгновенное бронирование
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Адрес (улица)
          <Input value={values.addressLine1} onChange={(event) => handleChange('addressLine1', event.target.value)} required />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Квартира/этаж (опционально)
          <Input value={values.addressLine2 ?? ''} onChange={(event) => handleChange('addressLine2', event.target.value)} />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Город
          <Input value={values.city} onChange={(event) => handleChange('city', event.target.value)} required />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Регион
          <Input value={values.state ?? ''} onChange={(event) => handleChange('state', event.target.value)} />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Страна
          <Input value={values.country} onChange={(event) => handleChange('country', event.target.value)} required />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Почтовый индекс
          <Input value={values.postalCode ?? ''} onChange={(event) => handleChange('postalCode', event.target.value)} />
        </label>
        <NumberField
          label="Широта"
          value={values.latitude}
          onChange={(val) => handleChange('latitude', val)}
          min={-90}
          max={90}
          step={0.000001}
        />
        <NumberField
          label="Долгота"
          value={values.longitude}
          onChange={(val) => handleChange('longitude', val)}
          min={-180}
          max={180}
          step={0.000001}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Удобства</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={selectedAmenities.has(amenity.id)}
                onChange={() => toggleAmenity(amenity.id)}
                className="h-4 w-4 rounded border-slate-300 text-pine-600 focus:ring-pine-500"
              />
              <span>{amenity.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Фотографии</h3>

        {/* File upload */}
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500 transition hover:border-pine-400 hover:text-pine-600 sm:px-6">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Загрузить фото с компьютера
          <input
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>

        {values.uploadFiles.length > 0 && (
          <ul className="space-y-2">
            {values.uploadFiles.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-3 shrink-0 text-slate-400 hover:text-red-500"
                  aria-label="Удалить файл"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-400">Или укажите ссылки вручную (по одной на строку):</p>
        <Textarea
          rows={3}
          value={values.images}
          onChange={(event) => handleChange('images', event.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
      </section>

      <div className="flex justify-end">
        <Button className="w-full sm:w-auto" type="submit" disabled={submitting}>
          {submitting ? 'Сохраняем…' : 'Сохранить объявление'}
        </Button>
      </div>
    </form>
  );
}

function mapListingToForm(listing: Listing): ListingFormValues {
  return {
    title: listing.title,
    summary: listing.summary ?? '',
    description: listing.description,
    propertyType: listing.propertyType,
    guests: listing.guests,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    bathrooms: Number(listing.bathrooms),
    basePrice: Number(listing.basePrice),
    cleaningFee: listing.cleaningFee ? Number(listing.cleaningFee) : undefined,
    serviceFee: listing.serviceFee ? Number(listing.serviceFee) : undefined,
    currency: listing.currency,
    instantBook: listing.instantBook,
    addressLine1: listing.addressLine1,
    addressLine2: listing.addressLine2 ?? undefined,
    city: listing.city,
    state: listing.state ?? undefined,
    country: listing.country,
    postalCode: listing.postalCode ?? undefined,
    latitude: Number(listing.latitude),
    longitude: Number(listing.longitude),
    amenityIds: listing.amenities.map((item) => item.amenity.id),
    images: listing.images.map((image) => image.url).join('\n'),
    uploadFiles: [],
  };
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        inputMode={step && step < 1 ? 'decimal' : 'numeric'}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}
