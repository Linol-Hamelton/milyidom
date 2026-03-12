import axios from "axios";
import { api } from "../lib/api-client";
import type { Favorite } from "../types/api";

interface FavoritesResponse {
  items: Favorite[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export async function fetchFavorites(page = 1, limit = 20) {
  try {
    const { data } = await api.get<FavoritesResponse>("/favorites", { params: { page, limit } });
    return data;
  } catch (error) {
    console.warn("Could not fetch favorites:", error);
    return { items: [], meta: { total: 0, page: 1, limit, totalPages: 0 } };
  }
}

export async function fetchFavoritesCount() {
  try {
    const { data } = await api.get<{ count: number }>("/favorites/count");
    return data;
  } catch (error) {
    console.warn("Could not fetch favorites count:", error);
    return { count: 0 };
  }
}

export async function checkFavorite(listingId: string) {
  try {
    const { data } = await api.get<{ isFavorite: boolean }>(`/favorites/${listingId}/check`);
    return data;
  } catch (error) {
    console.warn(`Could not check favorite status for listing ${listingId}:`, error);
    return { isFavorite: false };
  }
}

export async function addFavorite(listingId: string) {
  try {
    const { data } = await api.post<Favorite>(`/favorites/${listingId}`);
    return data;
  } catch (error: unknown) {
    console.warn(`Could not add favorite for listing ${listingId}:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        throw new Error("Войдите в аккаунт, чтобы добавлять в избранное.");
      }
      if (status === 400) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message ?? "Не удалось добавить объявление в избранное.");
      }
      if (status === 409) {
        throw new Error("Объявление уже сохранено в избранном.");
      }
    }

    throw new Error("Не удалось сохранить объявление. Попробуйте ещё раз.");
  }
}

export async function removeFavorite(listingId: string) {
  try {
    const { data } = await api.delete<Favorite>(`/favorites/${listingId}`);
    return data;
  } catch (error: unknown) {
    console.warn(`Could not remove favorite for listing ${listingId}:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        throw new Error("Войдите в аккаунт, чтобы управлять избранным.");
      }
      if (status === 400) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        throw new Error(message ?? "Не удалось удалить объявление из избранного.");
      }
      if (status === 404) {
        throw new Error("Объявление не найдено в избранном.");
      }
    }

    throw new Error("Не удалось обновить список избранного. Попробуйте ещё раз.");
  }
}
