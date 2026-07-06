import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { ListResourcesParams, Resource } from '@/types/resource';

export interface ListResourcesResult {
  data: Resource[];
  meta: ResponseMeta;
}

export async function listResources(params: ListResourcesParams = {}): Promise<ListResourcesResult> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/resources', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getResourceBySlug(slug: string): Promise<Resource> {
  const response = await apiClient.get<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}`,
  );
  return response.data.data;
}
