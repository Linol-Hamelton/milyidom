import { api } from '../lib/api-client';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  totalEarned: number;
  tier: LoyaltyTier;
  nextTier: { tier: LoyaltyTier; pointsNeeded: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  points: number;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRE';
  description: string;
  bookingId?: string | null;
  createdAt: string;
}

export const fetchLoyaltyBalance = async (): Promise<LoyaltyAccount> => {
  const { data } = await api.get<LoyaltyAccount>('/loyalty/me');
  return data;
};

export const fetchLoyaltyHistory = async (limit = 20): Promise<LoyaltyTransaction[]> => {
  const { data } = await api.get<LoyaltyTransaction[]>('/loyalty/history', {
    params: { limit },
  });
  return data;
};

export const redeemLoyaltyPoints = async (
  points: number,
  bookingId: string,
): Promise<number> => {
  const { data } = await api.post<number>('/loyalty/redeem', { points, bookingId });
  return data;
};
