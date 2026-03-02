import axios from "axios";
import { api } from "../lib/api-client";
import type { PaginatedResponse, Review, ReviewStats } from "../types/api";
import { OFFLINE_LISTING_PREFIX } from "../data/offline-listings";

export async function createReview(payload: {
  bookingId: string;
  rating: number;
  comment?: string;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
}) {
  try {
    const { data } = await api.post<Review>("/reviews", payload);
    return data;
  } catch (error: unknown) {
    console.warn("Could not create review:", error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) {
        throw new Error("Оставить отзыв можно только о завершённой поездке.");
      }
      if (status === 400) {
        throw new Error("Форма отзыва заполнена некорректно. Проверьте данные и попробуйте снова.");
      }
    }
    throw new Error("Не удалось отправить отзыв. Попробуйте ещё раз.");
  }
}

export async function fetchListingReviews(listingId: string, page = 1) {
  if (listingId.startsWith(OFFLINE_LISTING_PREFIX)) {
    console.warn("Offline listing ID for reviews:", listingId);
    return {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
      },
    } satisfies PaginatedResponse<Review>;
  }

  try {
    const { data } = await api.get<PaginatedResponse<Review>>(`/reviews/listing/${listingId}?page=${page}`);
    // Backend may return { reviews, total, page, limit } instead of { items, meta }
    const raw = data as unknown as Record<string, unknown>;
    const items = (data.items ?? raw['reviews'] ?? []) as Review[];
    const meta = data.meta ?? {
      page: (raw['page'] as number) ?? 1,
      limit: (raw['limit'] as number) ?? 10,
      total: (raw['total'] as number) ?? 0,
    };
    return { items, meta };
  } catch (error) {
    console.warn(`Could not fetch reviews for listing ${listingId}:`, error);
    return {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
      },
    } satisfies PaginatedResponse<Review>;
  }
}

export async function fetchListingReviewStats(listingId: string) {
  if (listingId.startsWith(OFFLINE_LISTING_PREFIX)) {
    console.warn("Offline listing ID for review stats:", listingId);
    return {
      averageRating: 0,
      totalReviews: 0,
      detailedRatings: {},
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    } satisfies ReviewStats;
  }

  try {
    const { data } = await api.get<ReviewStats>(`/reviews/listing/${listingId}/stats`);
    return data;
  } catch (error) {
    console.warn(`Could not fetch review stats for listing ${listingId}:`, error);
    return {
      averageRating: 0,
      totalReviews: 0,
      detailedRatings: {},
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    } satisfies ReviewStats;
  }
}

export async function fetchUserReviews() {
  try {
    const { data } = await api.get<Review[]>("/reviews/me");
    return data;
  } catch (error) {
    console.warn("Could not fetch user reviews:", error);
    return [];
  }
}

export async function fetchHostReviews() {
  try {
    const { data } = await api.get<Review[]>("/reviews/host/me");
    return data;
  } catch (error) {
    console.warn("Could not fetch host reviews:", error);
    return [];
  }
}

export async function fetchFeaturedReviews(limit?: number, options?: { signal?: AbortSignal }) {
  try {
    const query = limit ? `?limit=${limit}` : "";
    const { data } = await api.get<Review[]>(`/reviews/featured${query}`, {
      signal: options?.signal,
    });
    return data;
  } catch (error) {
    if (axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError")) {
      return [];
    }
    console.warn("Could not fetch featured reviews:", error);
    return [];
  }
}

export async function toggleFeaturedReview(reviewId: string, isFeatured: boolean) {
  try {
    const { data } = await api.patch<Review>(`/reviews/${reviewId}/feature`, { isFeatured });
    return data;
  } catch (error) {
    console.warn("Could not toggle featured review:", error);
    throw error;
  }
}

export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  const { data } = await api.patch<Review>(`/reviews/${reviewId}/reply`, { reply });
  return data;
}

export async function deleteReplyToReview(reviewId: string): Promise<Review> {
  const { data } = await api.delete<Review>(`/reviews/${reviewId}/reply`);
  return data;
}

export async function adminFetchReviews(page = 1, limit = 20) {
  const { data } = await api.get<{ items: Review[]; meta: { page: number; limit: number; total: number } }>(
    `/reviews/admin/all?page=${page}&limit=${limit}`,
  );
  return data;
}

export async function adminHideReview(reviewId: string): Promise<Review> {
  const { data } = await api.patch<Review>(`/reviews/${reviewId}/hide`, {});
  return data;
}

export async function adminDeleteReview(reviewId: string): Promise<void> {
  await api.delete(`/reviews/${reviewId}`);
}

export async function fetchReviewSummary(listingId: string): Promise<string> {
  if (listingId.startsWith(OFFLINE_LISTING_PREFIX)) return '';
  try {
    const { data } = await api.get<{ summary: string; reviewCount: number }>(
      `/reviews/listing/${listingId}/summary`,
    );
    return data.summary;
  } catch {
    return '';
  }
}




