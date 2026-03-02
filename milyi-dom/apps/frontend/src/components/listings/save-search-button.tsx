'use client';

import { useState } from 'react';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { createSavedSearch } from '../../services/saved-searches';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';
import type { ListingSearchFilters } from '../../types/api';

interface Props {
  filters: ListingSearchFilters;
}

export function SaveSearchButton({ filters }: Props) {
  const { isAuthenticated } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const handleSave = async () => {
    if (saved) return;
    setLoading(true);
    try {
      const city = filters.city ?? '';
      const name = city ? `${city} · поиск` : 'Мой поиск';
      await createSavedSearch({
        name,
        filters: filters as Record<string, unknown>,
        notifyEmail: true,
      });
      setSaved(true);
      toast.success('Поиск сохранён! Мы уведомим вас о новых объявлениях.');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={loading || saved}
      className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-soft hover:border-pine-300 hover:text-pine-700 disabled:opacity-60 transition-colors"
      title={saved ? 'Поиск сохранён' : 'Сохранить этот поиск'}
    >
      {saved ? (
        <BookmarkSolidIcon className="h-4 w-4 text-pine-600" />
      ) : (
        <BookmarkIcon className="h-4 w-4" />
      )}
      {saved ? 'Сохранено' : 'Сохранить поиск'}
    </button>
  );
}
