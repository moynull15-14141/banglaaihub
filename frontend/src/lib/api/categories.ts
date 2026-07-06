import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Category } from '@/types/category';
import type { Resource } from '@/types/resource';

export interface ListCategoryResourcesResult {
  data: Resource[];
  meta: ResponseMeta;
}

export async function listCategories(): Promise<Category[]> {
  const response = await apiClient.get<ApiSuccessResponse<Category[]>>('/categories');
  return response.data.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  const response = await apiClient.get<ApiSuccessResponse<Category>>(
    `/categories/${encodeURIComponent(slug)}`,
  );
  return response.data.data;
}

export async function listCategoryResources(
  slug: string,
  params: { page?: number; limit?: number } = {},
): Promise<ListCategoryResourcesResult> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>(
    `/categories/${encodeURIComponent(slug)}/resources`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}
