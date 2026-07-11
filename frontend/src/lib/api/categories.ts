import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category';
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

// --- Admin taxonomy management (admin:manage only, see resources.routes.ts) ---

export async function createCategoryAdmin(input: CreateCategoryInput): Promise<Category> {
  const response = await apiClient.post<ApiSuccessResponse<Category>>('/categories', input);
  return response.data.data;
}

export async function updateCategoryAdmin(id: number, input: UpdateCategoryInput): Promise<Category> {
  const response = await apiClient.put<ApiSuccessResponse<Category>>(`/categories/${id}`, input);
  return response.data.data;
}

export async function deleteCategoryAdmin(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
