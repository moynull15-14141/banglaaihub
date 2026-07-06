import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { User } from '@/types/user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: User;
}

export interface RefreshResult {
  accessToken: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await apiClient.post<ApiSuccessResponse<LoginResult>>(
    '/auth/login',
    credentials,
  );
  return response.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refresh(): Promise<RefreshResult> {
  const response = await apiClient.post<ApiSuccessResponse<RefreshResult>>('/auth/refresh');
  return response.data.data;
}
