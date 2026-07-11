import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Resource } from '@/types/resource';

export async function listPinnedResources(username: string): Promise<Resource[]> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>(
    `/users/${encodeURIComponent(username)}/pinned-resources`,
  );
  return response.data.data;
}

export async function listMyPinnedResources(): Promise<Resource[]> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/users/me/pinned-resources');
  return response.data.data;
}

export async function pinResource(resourceId: string): Promise<void> {
  await apiClient.post('/users/me/pinned-resources', { resource_id: resourceId });
}

export async function unpinResource(resourceId: string): Promise<void> {
  await apiClient.delete(`/users/me/pinned-resources/${encodeURIComponent(resourceId)}`);
}

export async function reorderPinnedResources(resourceIds: string[]): Promise<void> {
  await apiClient.patch('/users/me/pinned-resources/reorder', { resource_ids: resourceIds });
}
