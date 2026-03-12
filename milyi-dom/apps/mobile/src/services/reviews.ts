import { apiClient } from '@/api/client';

export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment: string;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
}

export const createReview = async (payload: CreateReviewPayload): Promise<void> => {
  await apiClient.post('/reviews', payload);
};
