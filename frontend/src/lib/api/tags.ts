import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Tag } from '@/types/tag';

export async function listTags(): Promise<Tag[]> {
  const response = await apiClient.get<ApiSuccessResponse<Tag[]>>('/tags');
  return response.data.data;
}

export async function searchTags(q: string): Promise<Tag[]> {
  const response = await apiClient.get<ApiSuccessResponse<Tag[]>>('/tags/search', { params: { q } });
  return response.data.data;
}

export async function getTagBySlug(slug: string): Promise<Tag> {
  const response = await apiClient.get<ApiSuccessResponse<Tag>>(`/tags/${encodeURIComponent(slug)}`);
  return response.data.data;
}
