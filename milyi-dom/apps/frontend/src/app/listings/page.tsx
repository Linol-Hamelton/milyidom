'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ListingFilters } from '../../components/listings/listing-filters';
import { ListingCard } from '../../components/listings/listing-card';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { fetchAmenities } from '../../services/amenities';
import { searchListings } from '../../services/listings';
import type { Amenity, Listing, ListingSearchFilters, PaginatedResponse } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { OFFLINE_LISTING_PREFIX, searchOfflineListings } from '../../data/offline-listings';
const INITIAL_FILTERS: ListingSearchFilters = {
  guests: 1,
  limit: 12,
  page: 1,
};
export default function ListingsPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [results, setResults] = useState<PaginatedResponse<Listing>>({
    items: [],
    meta: { page: 1, limit: INITIAL_FILTERS.limit ?? 12, total: 0 },
  });
  const [filters, setFilters] = useState<ListingSearchFilters>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
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
    loadListings(INITIAL_FILTERS);
  }, [loadAmenities, loadListings]);
  const handleApplyFilters = (next: ListingSearchFilters) => {
    loadListings({ ...filters, ...next, page: 1 });
  };
  const handlePageChange = (direction: 'prev' | 'next') => {
    const currentPage = filters.page ?? 1;
    const targetPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    if (targetPage < 1 || targetPage > totalPages) return;
    loadListings({ ...filters, page: targetPage });
  };
  return (
    <div className="bg-sand-50 py-12">
      <div className="mx-auto flex max-w-content-2xl flex-col gap-8 px-4 sm:px-6 lg:px-10">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-pine-600">Catalog</p>
          <h1 className="text-3xl font-serif text-slate-900">Find the right stay for your trip</h1>
          <p className="text-sm text-slate-500">
            Filter by city, price, amenities, and rating to see listings that match your plans.
          </p>
          {usingFallback && (
            <p className="text-xs text-slate-500">
              The remote API is unreachable right now, so we are showing demo listings instead.
            </p>
          )}
        </div>
        <ListingFilters amenities={amenities} onApply={handleApplyFilters} initialFilters={filters} />
        <section className="space-y-4">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-3xl" />
              ))}
            </div>
          ) : results.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-pine-200 bg-white/70 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold text-slate-900">No listings matched your filters</h2>
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting the dates, price range, or amenities to find more options.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{`Found ${results.meta.total} places - page ${results.meta.page} of ${totalPages}`}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={results.meta.page <= 1 || loading}
                    onClick={() => handlePageChange('prev')}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={results.meta.page >= totalPages || loading}
                    onClick={() => handlePageChange('next')}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
