import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { PublicProfile, User } from '@/types/user';
import type { UserDashboardStats } from '@/types/dashboard';
import type { Resource } from '@/types/resource';

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiSuccessResponse<User>>('/users/me');
  return response.data.data;
}

export async function getMyDashboard(): Promise<UserDashboardStats> {
  const response = await apiClient.get<ApiSuccessResponse<UserDashboardStats>>('/users/me/dashboard');
  return response.data.data;
}

// GET /users/me/submissions — the existing submission-history endpoint
// (backend/src/services/users.service.ts's listSubmissions). `status` uses
// the endpoint's own vocabulary (draft/pending/published/rejected), where
// "draft" and "pending" are both synonyms for the DB's `pending` status —
// there is no separate draft system.
export type SubmissionStatusFilter = 'draft' | 'pending' | 'published' | 'rejected';

export interface ListMySubmissionsParams {
  status?: SubmissionStatusFilter;
  page?: number;
  limit?: number;
}

export interface ListMySubmissionsResult {
  data: Resource[];
  meta: ResponseMeta;
}

export async function listMySubmissions(
  params: ListMySubmissionsParams = {},
): Promise<ListMySubmissionsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/users/me/submissions', {
    params,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getPublicProfile(username: string): Promise<PublicProfile> {
  const response = await apiClient.get<ApiSuccessResponse<PublicProfile>>(
    `/users/${encodeURIComponent(username)}`,
  );
  return response.data.data;
}
