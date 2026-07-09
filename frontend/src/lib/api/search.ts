import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { LicenseFacet, PopularSearchEntry, SearchParams, SearchResult, SearchSuggestion } from '@/types/search';

export interface SearchResourcesResult {
  data: SearchResult[];
  meta: ResponseMeta;
}

export async function search(params: SearchParams, signal?: AbortSignal): Promise<SearchResourcesResult> {
  const { tags, ...rest } = params;
  const response = await apiClient.get<ApiSuccessResponse<SearchResult[]>>('/search', {
    // Backend expects a single comma-separated string (see
    // commaSeparatedTags in search.validator.ts), not axios's default
    // repeated-key array serialization.
    params: { ...rest, tags: tags && tags.length > 0 ? tags.join(',') : undefined },
    signal,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getSearchSuggestions(q: string, signal?: AbortSignal): Promise<SearchSuggestion[]> {
  if (!q.trim()) return [];
  const response = await apiClient.get<ApiSuccessResponse<SearchSuggestion[]>>('/search/suggest', {
    params: { q },
    signal,
  });
  return response.data.data;
}

export async function getPopularSearches(days?: number, limit?: number): Promise<PopularSearchEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<PopularSearchEntry[]>>('/search/popular', {
    params: { days, limit },
  });
  return response.data.data;
}

export async function getLicenseFacets(): Promise<LicenseFacet[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ licenses: LicenseFacet[] }>>('/search/filters');
  return response.data.data.licenses;
}
