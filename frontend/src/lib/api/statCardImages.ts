import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { ResourceType } from '@/types/resource';

export interface StatCardImage {
  slot: ResourceType;
  url: string | null;
}

export async function getStatCardImages(): Promise<StatCardImage[]> {
  const response = await apiClient.get<ApiSuccessResponse<StatCardImage[]>>('/site-settings/stat-cards');
  return response.data.data;
}

export async function uploadStatCardImage(slot: ResourceType, file: File): Promise<StatCardImage[]> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiSuccessResponse<StatCardImage[]>>(
    `/site-settings/stat-cards/${slot}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data.data;
}

export async function resetStatCardImage(slot: ResourceType): Promise<void> {
  await apiClient.delete(`/site-settings/stat-cards/${slot}`);
}
