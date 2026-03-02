import { api } from '../lib/api-client';

export interface MonthlyRevenue {
  month: string; // "2025-01"
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

export const fetchHostAnalytics = async (): Promise<HostAnalytics> => {
  const { data } = await api.get<HostAnalytics>('/analytics/host');
  return data;
};

export interface TopCity {
  city: string;
  count: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalHosts: number;
  totalListings: number;
  totalBookings: number;
  totalRevenue: number;
  gmv30d: number;
  newUsers30d: number;
  conversionRate: number;
  topCities: TopCity[];
}

export const fetchAdminAnalytics = async (): Promise<AdminAnalytics> => {
  const { data } = await api.get<AdminAnalytics>('/analytics/admin');
  return data;
};
