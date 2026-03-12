import { apiClient } from '../api/client';

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  bookingsCount: number;
}

export interface ListingPerformance {
  listingId: string;
  title: string;
  city: string;
  revenue: number;
  bookingsCount: number;
  occupancyRate: number;
  avgRating: number;
}

export interface HostAnalytics {
  totalRevenue: number;
  totalBookings: number;
  avgOccupancyRate: number;
  monthlyRevenue: MonthlyRevenue[];
  listingPerformance: ListingPerformance[];
  upcomingCheckIns: number;
  upcomingCheckOuts: number;
}

export interface HostBooking {
  id: string;
  checkIn: string;
  checkOut: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  adults: number;
  children: number;
  totalPrice: string;
  currency: string;
  listing: { id: string; title: string; city: string; images: Array<{ url: string; isPrimary: boolean }> };
  guest: { id: string; email: string; profile?: { firstName?: string; lastName?: string; avatarUrl?: string } };
}

export const fetchHostAnalytics = async (): Promise<HostAnalytics> => {
  const { data } = await apiClient.get<HostAnalytics>('/analytics/host');
  return data;
};

export const fetchHostBookings = async (page = 1, limit = 20): Promise<{ items: HostBooking[]; meta: { total: number; totalPages: number } }> => {
  const { data } = await apiClient.get('/bookings/host', { params: { page, limit } });
  return data as { items: HostBooking[]; meta: { total: number; totalPages: number } };
};

export const confirmBooking = async (id: string): Promise<void> => {
  await apiClient.patch(`/bookings/${id}/status`, { status: 'CONFIRMED' });
};

export const declineBooking = async (id: string): Promise<void> => {
  await apiClient.patch(`/bookings/${id}/status`, { status: 'CANCELLED' });
};
