import { apiClient } from '../api/client';

export interface AuthUser {
  id: string;
  email: string;
  role: 'GUEST' | 'HOST' | 'ADMIN';
  isVerified: boolean;
  isSuperhost: boolean;
  profile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AuthTokens {
  access_token: string;
}

export const login = async (email: string, password: string): Promise<AuthTokens> => {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', { email, password });
  return data;
};

export const register = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<AuthTokens> => {
  const { data } = await apiClient.post<AuthTokens>('/auth/register', {
    email,
    password,
    firstName,
    lastName,
  });
  return data;
};

export const fetchMe = async (): Promise<AuthUser> => {
  const { data } = await apiClient.get<AuthUser>('/users/me');
  return data;
};
