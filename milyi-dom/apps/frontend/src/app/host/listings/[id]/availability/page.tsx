'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../../../components/ui/require-auth';
import { AvailabilityCalendar } from '../../../../../components/host/availability-calendar';
import { IcalSync } from '../../../../../components/host/ical-sync';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { fetchListing } from '../../../../../services/listings';
import { parseError } from '../../../../../lib/api-client';
import type { Listing } from '../../../../../types/api';

export default function AvailabilityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListing(listingId)
      .then(setListing)
      .catch((err) => toast.error(parseError(err).message))
      .finally(() => setLoading(false));
  }, [listingId]);

  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-2xl px-4 sm:px-6 lg:px-10">
          <header className="mb-8">
            <button
              onClick={() => router.push('/host/listings')}
              className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Назад к объявлениям
            </button>
            {loading ? (
              <Skeleton className="h-8 w-64 rounded-xl" />
            ) : (
              <>
                <p className="text-sm uppercase tracking-wide text-pine-600">Управление доступностью</p>
                <h1 className="mt-1 text-3xl font-serif text-slate-900">{listing?.title ?? '—'}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {listing?.city}, {listing?.country}
                </p>
              </>
            )}
          </header>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Interactive calendar */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Календарь доступности</h2>
              <AvailabilityCalendar listingId={listingId} />
            </section>

            {/* iCal sync */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-800">Синхронизация календарей</h2>
              <IcalSync listingId={listingId} icalToken={listing?.icalToken} />
            </section>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
