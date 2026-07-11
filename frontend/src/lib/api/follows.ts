import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { FollowUserSummary, ListFollowParams } from '@/types/follow';

export interface ListFollowResult {
  data: FollowUserSummary[];
  meta: ResponseMeta;
}

export async function followUser(username: string): Promise<void> {
  await apiClient.post(`/users/${encodeURIComponent(username)}/follow`);
}

export async function unfollowUser(username: string): Promise<void> {
  await apiClient.delete(`/users/${encodeURIComponent(username)}/follow`);
}

export async function listFollowers(username: string, params: ListFollowParams = {}): Promise<ListFollowResult> {
  const response = await apiClient.get<ApiSuccessResponse<FollowUserSummary[]>>(
    `/users/${encodeURIComponent(username)}/followers`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function listFollowing(username: string, params: ListFollowParams = {}): Promise<ListFollowResult> {
  const response = await apiClient.get<ApiSuccessResponse<FollowUserSummary[]>>(
    `/users/${encodeURIComponent(username)}/following`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}
