import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Badge, CreateBadgeInput, UpdateBadgeInput } from '@/types/badge';

export async function listUserBadges(username: string): Promise<Badge[]> {
  const response = await apiClient.get<ApiSuccessResponse<Badge[]>>(
    `/users/${encodeURIComponent(username)}/badges`,
  );
  return response.data.data;
}

// --- Admin badge catalog CRUD --------------------------------------------------

export async function listBadgeCatalogAdmin(): Promise<Badge[]> {
  const response = await apiClient.get<ApiSuccessResponse<Badge[]>>('/admin/badges');
  return response.data.data;
}

export async function createBadgeAdmin(input: CreateBadgeInput): Promise<Badge> {
  const response = await apiClient.post<ApiSuccessResponse<Badge>>('/admin/badges', input);
  return response.data.data;
}

export async function updateBadgeAdmin(id: number, input: UpdateBadgeInput): Promise<Badge> {
  const response = await apiClient.patch<ApiSuccessResponse<Badge>>(`/admin/badges/${id}`, input);
  return response.data.data;
}

export async function deleteBadgeAdmin(id: number): Promise<void> {
  await apiClient.delete(`/admin/badges/${id}`);
}

export async function grantBadgeAdmin(userId: string, badgeId: number): Promise<void> {
  await apiClient.post(`/admin/users/${encodeURIComponent(userId)}/badges`, { badge_id: badgeId });
}

export async function revokeBadgeAdmin(userId: string, badgeId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${encodeURIComponent(userId)}/badges/${badgeId}`);
}
