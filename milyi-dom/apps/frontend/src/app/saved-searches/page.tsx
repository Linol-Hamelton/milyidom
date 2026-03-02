"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { fetchSavedSearches, deleteSavedSearch, type SavedSearch } from '../../services/saved-searches';
import { parseError } from '../../lib/api-client';

function buildSearchUrl(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `/listings?${qs}` : '/listings';
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSavedSearches();
      setSearches(data);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Поиск удалён');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  return (
    <RequireAuth roles={['GUEST', 'HOST', 'ADMIN']}>
      <div className="bg-sand-50 min-h-screen py-12">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-10">
          <header className="mb-8 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Личный кабинет
            </p>
            <h1 className="text-2xl font-serif font-semibold text-slate-900">
              Сохранённые поиски
            </h1>
            <p className="text-sm text-slate-500">
              Мы будем уведомлять вас по email, когда появятся новые объявления по вашим запросам.
            </p>
          </header>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : searches.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-12 shadow-soft text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-slate-300" />
              <p className="text-slate-500">У вас пока нет сохранённых поисков.</p>
              <Link href="/listings">
                <Button variant="ghost" className="text-pine-600">
                  Перейти к поиску
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {searches.map((search) => {
                const url = buildSearchUrl(search.filters);
                const filters = Object.entries(search.filters)
                  .filter(([, v]) => v !== undefined && v !== null && v !== '')
                  .map(([k, v]) => `${k}: ${String(v)}`)
                  .join(' · ');

                return (
                  <article
                    key={search.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white px-6 py-4 shadow-soft"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{search.name}</p>
                      {filters && (
                        <p className="mt-0.5 text-xs text-slate-500 truncate">{filters}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        Сохранено {new Date(search.createdAt).toLocaleDateString('ru-RU')}
                        {search.notifyEmail && (
                          <span className="ml-2 rounded-full bg-pine-50 px-2 py-0.5 text-pine-700">
                            Email-уведомления вкл.
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={url}>
                        <Button variant="ghost" className="px-3 py-1.5 text-xs">
                          Открыть
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(search.id)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Удалить поиск"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
