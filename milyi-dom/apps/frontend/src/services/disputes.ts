import { api } from '../lib/api-client';

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

export interface Dispute {
  id: string;
  bookingId: string;
  reporterId: string;
  status: DisputeStatus;
  subject: string;
  description: string;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
    status: string;
    listing?: { id: string; title: string; slug: string };
    guest?: { id: string; email: string; profile?: { firstName: string; lastName: string } | null };
  };
  reporter?: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string } | null;
  };
}

export interface DisputesPage {
  items: Dispute[];
  meta: { page: number; limit: number; total: number };
}

export async function createDispute(data: {
  bookingId: string;
  subject: string;
  description: string;
}): Promise<Dispute> {
  const res = await api.post<Dispute>('/disputes', data);
  return res.data;
}

export async function getMyDisputes(): Promise<Dispute[]> {
  const res = await api.get<Dispute[]>('/disputes/me');
  return res.data;
}

export async function getAdminDisputes(params?: {
  page?: number;
  limit?: number;
  status?: DisputeStatus;
}): Promise<DisputesPage> {
  const res = await api.get<DisputesPage>('/admin/disputes', { params });
  return res.data;
}

export async function resolveDispute(
  id: string,
  data: { status: DisputeStatus; adminNotes?: string },
): Promise<Dispute> {
  const res = await api.patch<Dispute>(`/admin/disputes/${id}`, data);
  return res.data;
}
