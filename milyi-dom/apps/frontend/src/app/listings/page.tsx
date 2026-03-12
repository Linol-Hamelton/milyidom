'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CompactFilters } from '../../components/listings/compact-filters';
import { ListingCard } from '../../components/listings/listing-card';
import { ListingsMap } from '../../components/listings/listings-map';
import { AiSearchBar } from '../../components/ui/ai-search-bar';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { fetchAmenities } from '../../services/amenities';
import { searchListings } from '../../services/listings';
import { SaveSearchButton } from '../../components/listings/save-search-button';
import type { Amenity, Listing, ListingSearchFilters, PaginatedResponse } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { OFFLINE_LISTING_PREFIX, searchOfflineListings } from '../../data/offline-listings';

const INITIAL_FILTERS: ListingSearchFilters = {
  guests: 1,
  limit: 12,
  page: 1,
};

type ViewMode = 'list' | 'map' | 'split';

export default function ListingsPage() {
  const searchParams = useSearchParams();

  const initialFilters = useMemo<ListingSearchFilters>(() => {
    const city = searchParams.get('city') ?? undefined;
    const checkIn = searchParams.get('checkIn') ?? undefined;
    const checkOut = searchParams.get('checkOut') ?? undefined;
    const guestsRaw = searchParams.get('guests');
    const guests = guestsRaw ? Math.max(1, parseInt(guestsRaw, 10)) : 1;
    return { ...INITIAL_FILTERS, city, checkIn, checkOut, guests };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [results, setResults] = useState<PaginatedResponse<Listing>>({
    items: [],
    meta: { page: 1, limit: INITIAL_FILTERS.limit ?? 12, total: 0 },
  });
  const [filters, setFilters] = useState<ListingSearchFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [aiInterpretation, setAiInterpretation] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const totalPages = useMemo(() => {
    const { total, limit } = results.meta;
    return limit === 0 ? 1 : Math.max(Math.ceil(total / limit), 1);
  }, [results.meta]);

  const loadAmenities = useCallback(async () => {
    try {
      const data = await fetchAmenities();
      setAmenities(data);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  }, []);

  const loadListings = useCallback(async (payload: ListingSearchFilters) => {
    setLoading(true);
    try {
      const data = await searchListings(payload);
      setResults(data);
      setFilters(payload);
      setUsingFallback(data.items.every((item) => item.id.startsWith(OFFLINE_LISTING_PREFIX)));
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
      const fallback = searchOfflineListings(payload);
      setResults(fallback);
      setFilters({ ...payload, page: fallback.meta.page, limit: fallback.meta.limit });
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAmenities();
    loadListings(initialFilters);
  }, [loadAmenities, loadListings, initialFilters]);

  const handleApplyFilters = (next: ListingSearchFilters) => {
    setAiInterpretation('');
    loadListings({
      ...INITIAL_FILTERS,
      ...next,
      limit: filters.limit ?? INITIAL_FILTERS.limit,
      page: 1,
    });
  };

  const handleAiSearch = (aiFilters: Partial<ListingSearchFilters>, interpretation: string) => {
    setAiInterpretation(interpretation);
    loadListings({ ...INITIAL_FILTERS, ...aiFilters });
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const currentPage = filters.page ?? 1;
    const targetPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    if (targetPage < 1 || targetPage > totalPages) return;
    loadListings({ ...filters, page: targetPage });
  };

  return (
    <motion.div
      className="bg-sand-50 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mx-auto flex max-w-content-2xl flex-col gap-8 px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-pine-600">Каталог</p>
          <h1 className="font-serif text-3xl text-slate-900">Найдите идеальное жильё</h1>
          {usingFallback && (
            <p className="text-xs text-slate-500">
              API недоступен — показываем демо-объявления.
            </p>
          )}
        </div>

        {/* AI Search */}
        <div className="rounded-2xl border border-pine-100 bg-gradient-to-r from-pine-50 to-sand-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-pine-600">✦ AI-поиск</p>
          <AiSearchBar onSearch={handleAiSearch} />
          {aiInterpretation && (
            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-pine-700 shadow-sm">
              <strong>AI понял:</strong> {aiInterpretation}
            </p>
          )}
        </div>

        {/* Filters */}
        <CompactFilters amenities={amenities} onApply={handleApplyFilters} initialFilters={filters} />

        {/* View Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm text-slate-500">
              {loading ? 'Загрузка...' : `Найдено ${results.meta.total} объявлений`}
            </span>
            {!loading && results.meta.total > 0 && <SaveSearchButton filters={filters} />}
          </div>
          <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(['list', 'split', 'map'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === mode
                    ? 'bg-pine-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode === 'list' ? '☰ Список' : mode === 'map' ? '🗺 Карта' : '⊞ Оба'}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <section>
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-3xl" />
              ))}
            </div>
          ) : results.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-pine-200 bg-white/70 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Ничего не нашлось</h2>
              <p className="mt-2 text-sm text-slate-500">
                Попробуйте изменить фильтры или описать запрос по-другому.
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'split'
                  ? 'grid gap-6 lg:grid-cols-2'
                  : viewMode === 'map'
                  ? 'block'
                  : 'block'
              }
            >
              {/* Map */}
              {(viewMode === 'map' || viewMode === 'split') && (
                <div className={viewMode === 'map' ? 'mb-6' : ''}>
                  <ListingsMap
                    listings={results.items}
                    onListingClick={(listing) => {
                      setSelectedListing(listing);
                      if (viewMode === 'map') setViewMode('split');
                    }}
                    onSearchArea={(lat, lng, radiusKm) => {
                      const next: ListingSearchFilters = {
                        ...filters,
                        lat,
                        lng,
                        radiusKm,
                        city: undefined,
                        country: undefined,
                        location: undefined,
                        page: 1,
                      };
                      void loadListings(next);
                    }}
                  />
                  {selectedListing && viewMode === 'map' && (
                    <div className="mt-4">
                      <ListingCard listing={selectedListing} />
                    </div>
                  )}
                </div>
              )}

              {/* List */}
              {(viewMode === 'list' || viewMode === 'split') && (
                <div>
                  <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
                    <span>{`Страница ${results.meta.page} из ${totalPages}`}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={results.meta.page <= 1 || loading}
                        onClick={() => handlePageChange('prev')}
                      >
                        ← Назад
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={results.meta.page >= totalPages || loading}
                        onClick={() => handlePageChange('next')}
                      >
                        Далее →
                      </Button>
                    </div>
                  </div>
                  <div className={`grid gap-6 ${viewMode === 'split' ? 'sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {results.items.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>


      </div>
    </motion.div>
  );
}
