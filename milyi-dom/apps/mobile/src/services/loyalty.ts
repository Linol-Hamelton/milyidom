import { apiClient } from '../api/client';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyAccount {
  points: number;
  totalEarned: number;
  tier: LoyaltyTier;
  nextTier: { tier: LoyaltyTier; pointsNeeded: number } | null;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'BONUS';
  points: number;
  description: string;
  createdAt: string;
}

export const fetchLoyaltyBalance = async (): Promise<LoyaltyAccount> => {
  const { data } = await apiClient.get<LoyaltyAccount>('/loyalty/me');
  return data;
};

export const fetchLoyaltyHistory = async (limit = 20): Promise<LoyaltyTransaction[]> => {
  const { data } = await apiClient.get<LoyaltyTransaction[]>(`/loyalty/history?limit=${limit}`);
  return data;
};
