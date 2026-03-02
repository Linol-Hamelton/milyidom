import { apiClient } from '../api/client';

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  adults: number;
  children: number;
  totalPrice: string;
  currency: string;
  listing: {
    id: string;
    title: string;
    city: string;
    images: Array<{ url: string; isPrimary: boolean }>;
  };
}

export interface CreateBookingDto {
  listingId: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  adults: number;
  children?: number;
}

export const fetchMyBookings = async (): Promise<Booking[]> => {
  const { data } = await apiClient.get<{ items: Booking[] }>('/bookings/guest');
  return data.items;
};

export const createBooking = async (dto: CreateBookingDto): Promise<Booking> => {
  const { data } = await apiClient.post<Booking>('/bookings', dto);
  return data;
};

export const cancelBooking = async (id: string): Promise<void> => {
  await apiClient.patch(`/bookings/${id}/cancel`);
};
