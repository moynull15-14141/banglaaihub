import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { SearchParams, SearchResult } from '@/types/search';

export interface SearchResourcesResult {
  data: SearchResult[];
  meta: ResponseMeta;
}

export async function search(params: SearchParams): Promise<SearchResourcesResult> {
  const response = await apiClient.get<ApiSuccessResponse<SearchResult[]>>('/search', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}
