import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { PublicProfile, User } from '@/types/user';
import type { UserDashboardStats } from '@/types/dashboard';

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiSuccessResponse<User>>('/users/me');
  return response.data.data;
}

export async function getMyDashboard(): Promise<UserDashboardStats> {
  const response = await apiClient.get<ApiSuccessResponse<UserDashboardStats>>('/users/me/dashboard');
  return response.data.data;
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const response = await apiClient.get<ApiSuccessResponse<PublicProfile>>(
    `/users/${encodeURIComponent(username)}`,
  );
  return response.data.data;
}
