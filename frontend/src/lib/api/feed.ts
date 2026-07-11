import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { FeedCard, ListFeedParams } from '@/types/feed';

export interface ListFeedResult {
  data: FeedCard[];
  meta: ResponseMeta;
}

export async function listFeed(params: ListFeedParams = {}): Promise<ListFeedResult> {
  const response = await apiClient.get<ApiSuccessResponse<FeedCard[]>>('/feed', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

// Closes the previously-dormant seen-penalty loop — see useImpressionTracking.ts,
// which batches calls to this rather than firing one per card.
export async function recordImpressions(resourceIds: string[]): Promise<void> {
  if (resourceIds.length === 0) return;
  await apiClient.post('/feed/impressions', { resource_ids: resourceIds });
}
