"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RequireAuth } from "../../components/ui/require-auth";
import { ListingCard } from "../../components/listings/listing-card";
import { Button } from "../../components/ui/button";
import { fetchFavorites, removeFavorite } from "../../services/favorites";
import type { Favorite, Listing } from "../../types/api";
import { parseError } from "../../lib/api-client";
import { useAuth } from "../../hooks/useAuth";
import { OFFLINE_LISTING_PREFIX, offlineListings } from "../../data/offline-listings";

const OFFLINE_FAVORITES_KEY = "milyi-dom-offline-favorites";

const readOfflineFavorites = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(OFFLINE_FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn("Failed to read offline favorites", error);
    return [];
  }
};

const writeOfflineFavorites = (ids: string[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_FAVORITES_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn("Failed to persist offline favorites", error);
  }
};

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [offlineFavorites, setOfflineFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const syncOfflineFavorites = useCallback(() => {
    const ids = readOfflineFavorites();
    const entries = offlineListings.filter((listing) => ids.includes(listing.id));
    setOfflineFavorites(entries);
  }, []);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        setFavorites([]);
        return;
      }
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    syncOfflineFavorites();
  }, [syncOfflineFavorites]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (listingId: string) => {
    const isOfflineListing = listingId.startsWith(OFFLINE_LISTING_PREFIX);

    if (isOfflineListing) {
      const next = readOfflineFavorites().filter((id) => id !== listingId);
      writeOfflineFavorites(next);
      syncOfflineFavorites();
      toast.success("Removed from favorites.");
      return;
    }

    try {
      await removeFavorite(listingId);
      toast.success("Removed from favorites.");
      await loadFavorites();
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const hasFavorites = favorites.length > 0 || offlineFavorites.length > 0;
  const combinedFavorites = useMemo(
    () => ({ remote: favorites, offline: offlineFavorites }),
    [favorites, offlineFavorites],
  );

  return (
    <RequireAuth>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-xl px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Favorites</p>
            <h1 className="text-3xl font-serif text-slate-900">Homes you love</h1>
            <p className="text-sm text-slate-600">
              Keep a shortlist of listings to compare later. Save an offline showcase home or a live API listing - they will both appear here.
            </p>
          </header>

          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-3xl bg-white" />
              ))}
            </div>
          ) : !hasFavorites ? (
            <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Your favorites list is empty</h2>
              <p className="mt-2 text-sm text-slate-500">Browse the catalog and tap the heart icon to save a home for later.</p>
              <Button className="mt-4" onClick={() => router.push("/listings")}>
                Explore listings
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {combinedFavorites.remote.map((favorite) => (
                <div key={favorite.id} className="relative">
                  <ListingCard listing={favorite.listing} />
                  <Button
                    variant="ghost"
                    className="absolute right-4 top-4 bg-white/80"
                    onClick={() => handleRemove(favorite.listingId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              {combinedFavorites.offline.map((listing) => (
                <div key={`offline-${listing.id}`} className="relative">
                  <ListingCard listing={listing} />
                  <Button
                    variant="ghost"
                    className="absolute right-4 top-4 bg-white/80"
                    onClick={() => handleRemove(listing.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}





