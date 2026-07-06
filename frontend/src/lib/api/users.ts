import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { PublicProfile, User } from '@/types/user';

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiSuccessResponse<User>>('/users/me');
  return response.data.data;
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const response = await apiClient.get<ApiSuccessResponse<PublicProfile>>(
    `/users/${encodeURIComponent(username)}`,
  );
  return response.data.data;
}
