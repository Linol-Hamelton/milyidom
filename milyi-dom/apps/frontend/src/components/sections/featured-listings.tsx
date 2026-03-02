"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ListingCard } from '../listings/listing-card';
import { fetchFeaturedListings } from '../../services/listings';
import type { Listing } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { Skeleton } from '../ui/skeleton';
import { OFFLINE_LISTING_PREFIX, offlineListings } from '../../data/offline-listings';

export default function FeaturedListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchFeaturedListings({ signal: controller.signal });
        if (!isMounted) return;
        setListings(data);
        setIsFallback(data.every((item) => item.id.startsWith(OFFLINE_LISTING_PREFIX)));
      } catch (error) {
        if (axios.isCancel?.(error) || (error as Error)?.name === 'CanceledError') {
          return;
        }
        if (!isMounted) return;
        const { message } = parseError(error);
        toast.error(message);
        setListings(offlineListings);
        setIsFallback(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return (
    <section id="inspiration" className="mx-auto max-w-content-lg px-6 py-16 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-pine-600">Выбор редакции</p>
          <h2 className="font-serif text-3xl text-slate-900 md:text-4xl">Идеи для следующего путешествия</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Уютные дома и квартиры с характером, проверенные хосты и готовые к заезду апартаменты.
          </p>
          {isFallback && (
            <p className="mt-3 text-xs text-slate-500">
              Показаны демо-объявления — API временно недоступен.
            </p>
          )}
        </div>
        <Link href="/listings" className="text-sm font-medium text-pine-600 transition hover:text-pine-500">
          Все объявления →
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
