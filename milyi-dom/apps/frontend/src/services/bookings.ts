import axios from "axios";
import { api } from "../lib/api-client";
import type { Booking, PaginatedResponse } from "../types/api";

const buildQueryString = (params?: { page?: number; limit?: number }) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

export async function createBooking(payload: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  infants?: number;
  pets?: number;
}) {
  try {
    const { data } = await api.post<Booking>("/bookings", payload);
    return data;
  } catch (error: unknown) {
    console.warn("Could not create booking:", error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 400) {
        throw new Error("Некорректный запрос. Проверьте форму и попробуйте снова.");
      }
      if (status === 403) {
        throw new Error("У вас нет прав для создания этого бронирования.");
      }
      if (status === 409) {
        throw new Error("Выбранные даты больше недоступны.");
      }
      if (status === 500) {
        throw new Error("Сервис бронирования временно недоступен. Попробуйте позже.");
      }
    }
    throw new Error("Не удалось создать бронирование. Попробуйте ещё раз.");
  }
}

export async function fetchBooking(id: string) {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function fetchGuestBookings(params?: { page?: number; limit?: number }) {
  try {
    const qs = buildQueryString(params);
    const { data } = await api.get<PaginatedResponse<Booking>>(`/bookings/me${qs}`);
    return data;
  } catch (error) {
    console.warn("Could not fetch guest bookings:", error);
    return {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function fetchHostBookings(params?: { page?: number; limit?: number }) {
  try {
    const qs = buildQueryString(params);
    const { data } = await api.get<PaginatedResponse<Booking>>(`/bookings/host${qs}`);
    return data;
  } catch (error) {
    console.warn("Could not fetch host bookings:", error);
    return {
      items: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function cancelBooking(id: string) {
  try {
    const { data } = await api.patch<Booking>(`/bookings/${id}/cancel`, {});
    return data;
  } catch (error: unknown) {
    console.warn(`Could not cancel booking ${id}:`, error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 403) {
        throw new Error("Вы не можете отменить это бронирование.");
      }
      if (status === 404) {
        throw new Error("Бронирование не найдено.");
      }
    }
    throw new Error("Не удалось отменить бронирование. Попробуйте ещё раз.");
  }
}

export async function updateBookingStatus(
  id: string,
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED",
) {
  try {
    const { data } = await api.patch<Booking>(`/bookings/${id}/status`, { status });
    return data;
  } catch (error: unknown) {
    console.warn(`Could not update booking ${id} status:`, error);
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 403) {
        throw new Error("У вас нет прав для изменения статуса этого бронирования.");
      }
      if (statusCode === 404) {
        throw new Error("Бронирование не найдено.");
      }
    }
    throw new Error("Не удалось обновить статус бронирования. Попробуйте ещё раз.");
  }
}
