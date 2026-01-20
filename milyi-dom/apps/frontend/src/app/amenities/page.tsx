"use client";

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchAmenityCategories,
  fetchAmenities,
  fetchAmenitiesWithCounts,
} from '../../services/amenities';
import type { Amenity } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { Skeleton } from '../../components/ui/skeleton';

export default function AmenitiesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [categoriesData, amenitiesData, amenitiesWithCounts] = await Promise.all([
          fetchAmenityCategories(),
          fetchAmenities(),
          fetchAmenitiesWithCounts(),
        ]);
        setCategories(categoriesData);
        setAmenities(amenitiesData);
        const lookup = amenitiesWithCounts.reduce<Record<number, number>>((acc, item) => {
          acc[item.id] = item._count.listings;
          return acc;
        }, {});
        setCounts(lookup);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredAmenities = useMemo(() => {
    if (!selectedCategory) return amenities;
    return amenities.filter((item) => item.category === selectedCategory);
  }, [amenities, selectedCategory]);

  return (
    <div className="bg-sand-50 py-12">
      <div className="mx-auto max-w-content-xl px-6 lg:px-10">
        <header className="max-w-3xl space-y-3">
          <p className="text-sm uppercase tracking-wide text-pine-600">Комфорт</p>
          <h1 className="text-3xl font-serif text-slate-900">Все удобства, которые предлагает Милый Дом</h1>
          <p className="text-sm text-slate-600">
            Подбирайте жильё по важным параметрам: от семейных удобств до локальных особенностей и технологий для
            удалённой работы.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              selectedCategory === ''
                ? 'border-pine-500 bg-pine-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-pine-300 hover:text-pine-500'
            }`}
          >
            Все категории
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedCategory === category
                  ? 'border-pine-500 bg-pine-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-pine-300 hover:text-pine-500'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAmenities.map((amenity) => (
              <div key={amenity.id} className="rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-base font-semibold text-slate-900">{amenity.name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{amenity.category}</p>
                <p className="mt-4 text-sm text-slate-500">
                  Подходит {counts[amenity.id] ?? 0} объявлениям в каталоге
                </p>
              </div>
            ))}
            {filteredAmenities.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-pine-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">Мы пока не добавили удобства в эту категорию.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
