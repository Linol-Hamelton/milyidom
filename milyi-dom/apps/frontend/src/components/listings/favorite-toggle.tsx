"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { HeartIcon } from "@heroicons/react/24/solid";
import { addFavorite, checkFavorite, removeFavorite } from "../../services/favorites";
import { Button } from "../ui/button";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import { parseError } from "../../lib/api-client";
import { OFFLINE_LISTING_PREFIX } from "../../data/offline-listings";

interface FavoriteToggleProps {
  listingId: string;
  appearance?: "button" | "icon";
}

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

export function FavoriteToggle({ listingId, appearance = "button" }: FavoriteToggleProps) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const isOfflineListing = listingId.startsWith(OFFLINE_LISTING_PREFIX);

  const syncOfflineState = useCallback(() => {
    if (!isOfflineListing) return;
    const favorites = readOfflineFavorites();
    setIsFavorite(favorites.includes(listingId));
  }, [isOfflineListing, listingId]);

  const loadRemoteState = useCallback(async () => {
    if (!isAuthenticated || isOfflineListing) return;
    try {
      const data = await checkFavorite(listingId);
      setIsFavorite(data.isFavorite);
    } catch (error) {
      console.warn("Could not load favorite status:", error);
    }
  }, [isAuthenticated, isOfflineListing, listingId]);

  useEffect(() => {
    if (isOfflineListing) {
      syncOfflineState();
    } else {
      void loadRemoteState();
    }
  }, [isOfflineListing, syncOfflineState, loadRemoteState]);

  const toggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (loading) return;

    if (isOfflineListing) {
      const favorites = readOfflineFavorites();
      const next = favorites.includes(listingId)
        ? favorites.filter((id) => id !== listingId)
        : [...favorites, listingId];
      writeOfflineFavorites(next);
      setIsFavorite(next.includes(listingId));
      toast.success(next.includes(listingId) ? "Saved to favorites." : "Removed from favorites.");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please sign in to manage favorites.");
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(listingId);
        setIsFavorite(false);
        toast.success("Removed from favorites.");
      } else {
        await addFavorite(listingId);
        setIsFavorite(true);
        toast.success("Saved to favorites.");
      }
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (appearance === "icon") {
    return (
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading}
        aria-pressed={isFavorite}
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-full border transition",
          isFavorite
            ? "border-rose-500 bg-rose-500 text-white"
            : "border-white/80 bg-white/90 text-gray-600 hover:bg-white",
          loading && "opacity-70"
        )}
      >
        <HeartIcon
          className={clsx("h-4 w-4 transition", isFavorite ? "text-white" : "text-gray-600")}
        />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={isFavorite ? "secondary" : "ghost"}
      isLoading={loading}
      onClick={toggleFavorite}
      className="inline-flex items-center gap-2"
    >
      <HeartIcon className="h-5 w-5" />
      {isFavorite ? "In favorites" : "Save to favorites"}
    </Button>
  );
}
