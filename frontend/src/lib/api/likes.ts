import { apiClient } from '@/lib/api/client';

export async function likeResource(slug: string): Promise<void> {
  await apiClient.post(`/resources/${encodeURIComponent(slug)}/like`);
}

export async function unlikeResource(slug: string): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/like`);
}
