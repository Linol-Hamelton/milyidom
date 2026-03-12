import { apiClient } from '@/api/client';

export const subscribeNewsletter = async (email: string): Promise<void> => {
  await apiClient.post('/newsletter/subscribe', { email });
};
