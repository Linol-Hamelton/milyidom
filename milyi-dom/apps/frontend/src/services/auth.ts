import { api } from '../lib/api-client';
import type { User } from '../types/api';

type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};

export async function register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
  return data;
}

export async function requestPasswordReset(email: string) {
  try {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  } catch (error) {
    console.warn('Password reset unavailable offline. Returning empty response.', error);
    return { success: false };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.patch('/auth/change-password', { currentPassword, newPassword });
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/verify-email', { token });
  return data;
}

export async function resendVerification(): Promise<void> {
  await api.post('/auth/resend-verification');
}
