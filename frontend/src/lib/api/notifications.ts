import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { ListNotificationsParams, Notification } from '@/types/notification';

export interface ListNotificationsResult {
  data: Notification[];
  meta: ResponseMeta;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Notification[]>>('/notifications', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/notifications/${encodeURIComponent(id)}`);
}
