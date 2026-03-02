import { api } from '../lib/api-client';
import type { User, Listing, AuditLog, PlatformStats, PaginatedResponse, Role, ListingStatus } from '../types/api';

// ── Users ────────────────────────────────────────────────────────────────────

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  role?: Role;
  isVerified?: boolean;
  isSuperhost?: boolean;
  blocked?: boolean;
  search?: string;
}

export const fetchAdminUsers = async (
  params: GetAdminUsersParams = {},
): Promise<PaginatedResponse<User>> => {
  const { data } = await api.get<PaginatedResponse<User>>('/admin/users', { params });
  return data;
};

export const changeUserRole = async (userId: string, role: Role): Promise<User> => {
  const { data } = await api.patch<User>(`/admin/users/${userId}/role`, { role });
  return data;
};

export const blockUser = async (userId: string, blocked: boolean): Promise<User> => {
  const { data } = await api.patch<User>(`/admin/users/${userId}/block`, { blocked });
  return data;
};

// ── Listings ─────────────────────────────────────────────────────────────────

export interface GetAdminListingsParams {
  page?: number;
  limit?: number;
  status?: ListingStatus;
  city?: string;
  search?: string;
}

export const fetchAdminListings = async (
  params: GetAdminListingsParams = {},
): Promise<PaginatedResponse<Listing>> => {
  const { data } = await api.get<PaginatedResponse<Listing>>('/admin/listings', { params });
  return data;
};

export const moderateListing = async (
  listingId: string,
  status: ListingStatus,
): Promise<Listing> => {
  const { data } = await api.patch<Listing>(`/admin/listings/${listingId}/status`, { status });
  return data;
};

// ── Audit Log ─────────────────────────────────────────────────────────────────

export interface GetAuditLogParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  fromDate?: string;
  toDate?: string;
}

export const fetchAuditLog = async (
  params: GetAuditLogParams = {},
): Promise<PaginatedResponse<AuditLog>> => {
  const { data } = await api.get<PaginatedResponse<AuditLog>>('/admin/audit-log', { params });
  return data;
};

// ── Platform Stats ────────────────────────────────────────────────────────────

export const fetchPlatformStats = async (): Promise<PlatformStats> => {
  const { data } = await api.get<PlatformStats>('/admin/stats');
  return data;
};
