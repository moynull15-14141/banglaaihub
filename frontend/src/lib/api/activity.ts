import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Activity, Heatmap, ListActivityParams } from '@/types/activity';

export interface ListActivityResult {
  data: Activity[];
  meta: ResponseMeta;
}

export async function listActivity(username: string, params: ListActivityParams = {}): Promise<ListActivityResult> {
  const response = await apiClient.get<ApiSuccessResponse<Activity[]>>(
    `/users/${encodeURIComponent(username)}/activity`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getHeatmap(username: string, year?: number): Promise<Heatmap> {
  const response = await apiClient.get<ApiSuccessResponse<Heatmap>>(
    `/users/${encodeURIComponent(username)}/heatmap`,
    { params: year ? { year } : undefined },
  );
  return response.data.data;
}
