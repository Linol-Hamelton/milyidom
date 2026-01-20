import axios from 'axios';
import { api } from './api-client';

const isStatusError = (error: unknown, ...statuses: number[]) =>
  axios.isAxiosError(error) && error.response?.status !== undefined
    ? statuses.includes(error.response.status)
    : false;

export async function checkBackendHealth(): Promise<boolean> {
  try {
    // Try to access a simple endpoint that should exist
    const response = await api.get('/listings?limit=1');
    return response.status === 200;
  } catch (error: unknown) {
    // If we get a 401, the endpoint exists but requires auth
    // If we get a 404, the endpoint might not exist, but the server is responding
    if (isStatusError(error, 401, 404)) {
      return true; // Server is responding
    }
    console.error('Backend health check failed:', error);
    return false;
  }
}

export async function checkApiEndpoints(): Promise<{
  backend: boolean;
  reviews: boolean;
  favorites: boolean;
}> {
  const results = {
    backend: false,
    reviews: false,
    favorites: false,
  };

  try {
    // Check backend health
    results.backend = await checkBackendHealth();
    
    // Check reviews endpoint
    try {
      await api.get('/reviews/listing/test/stats');
      results.reviews = true;
    } catch (error: unknown) {
      // If we get a 404, the endpoint exists but the listing doesn't
      // If we get a 401, the endpoint exists but requires auth
      if (isStatusError(error, 404, 401)) {
        results.reviews = true;
      }
    }

    // Check favorites endpoint
    try {
      await api.get('/favorites/count');
      results.favorites = true;
    } catch (error: unknown) {
      // If we get a 401, the endpoint exists but requires auth
      if (isStatusError(error, 401)) {
        results.favorites = true;
      }
    }
  } catch (error) {
    console.error('API endpoints check failed:', error);
  }

  return results;
}
