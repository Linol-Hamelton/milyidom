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
      <div className="bg-sand-50 py-8 sm:py-12">
        <div className="mx-auto max-w-content-xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Избранное</p>
            <h1 className="text-2xl font-serif text-slate-900 sm:text-3xl">Жильё, которое вам понравилось</h1>
            <p className="text-sm text-slate-600">
              Сохраняйте понравившиеся объявления, чтобы вернуться к ним позже.
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pine-50 text-3xl">
                🤍
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Список избранного пуст</h2>
              <p className="mt-2 text-sm text-slate-500">
                Просматривайте каталог и нажимайте на сердечко ❤️, чтобы сохранить жильё.
              </p>
              <Button className="mt-6" onClick={() => router.push("/listings")}>
                Перейти в каталог
              </Button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {combinedFavorites.remote.map((favorite) => (
                <div key={favorite.id} className="relative">
                  <ListingCard listing={favorite.listing} />
                  <button
                    type="button"
                    className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-rose-600"
                    onClick={() => handleRemove(favorite.listingId)}
                  >
                    Удалить
                  </button>
                </div>
              ))}

              {combinedFavorites.offline.map((listing) => (
                <div key={`offline-${listing.id}`} className="relative">
                  <ListingCard listing={listing} />
                  <button
                    type="button"
                    className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white hover:text-rose-600"
                    onClick={() => handleRemove(listing.id)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

