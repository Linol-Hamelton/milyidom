import { apiClient } from '../api/client';

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyAccount {
  points: number;
  totalEarned: number;
  tier: LoyaltyTier;
  nextTier: { tier: LoyaltyTier; pointsNeeded: number } | null;
}

export const fetchLoyaltyBalance = async (): Promise<LoyaltyAccount> => {
  const { data } = await apiClient.get<LoyaltyAccount>('/loyalty/me');
  return data;
};
