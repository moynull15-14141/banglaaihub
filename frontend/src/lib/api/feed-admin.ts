import { apiClient } from '@/lib/api/client';
import type { UploadProgressInfo } from '@/lib/api/resources';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  CreateFeedAnnouncementInput,
  CreateFeedPinInput,
  FeedAnnouncement,
  FeedConfig,
  FeedConfigHistoryEntry,
  FeedPin,
  PreviewFeedInput,
  PreviewFeedResult,
  UpdateFeedAnnouncementInput,
  UpdateFeedConfigInput,
  UpdateFeedPinInput,
} from '@/types/feed-admin';

export async function getFeedConfigAdmin(): Promise<FeedConfig> {
  const response = await apiClient.get<ApiSuccessResponse<FeedConfig>>('/admin/feed/config');
  return response.data.data;
}

export async function updateFeedConfigAdmin(input: UpdateFeedConfigInput): Promise<FeedConfig> {
  const response = await apiClient.patch<ApiSuccessResponse<FeedConfig>>('/admin/feed/config', input);
  return response.data.data;
}

export async function listFeedPinsAdmin(): Promise<FeedPin[]> {
  const response = await apiClient.get<ApiSuccessResponse<FeedPin[]>>('/admin/feed/pins');
  return response.data.data;
}

export async function createFeedPinAdmin(input: CreateFeedPinInput): Promise<FeedPin> {
  const response = await apiClient.post<ApiSuccessResponse<FeedPin>>('/admin/feed/pins', input);
  return response.data.data;
}

export async function updateFeedPinAdmin(id: string, input: UpdateFeedPinInput): Promise<FeedPin> {
  const response = await apiClient.patch<ApiSuccessResponse<FeedPin>>(`/admin/feed/pins/${id}`, input);
  return response.data.data;
}

export async function deleteFeedPinAdmin(id: string): Promise<void> {
  await apiClient.delete(`/admin/feed/pins/${id}`);
}

export async function listFeedAnnouncementsAdmin(): Promise<FeedAnnouncement[]> {
  const response = await apiClient.get<ApiSuccessResponse<FeedAnnouncement[]>>('/admin/feed/announcements');
  return response.data.data;
}

export async function createFeedAnnouncementAdmin(input: CreateFeedAnnouncementInput): Promise<FeedAnnouncement> {
  const response = await apiClient.post<ApiSuccessResponse<FeedAnnouncement>>('/admin/feed/announcements', input);
  return response.data.data;
}

export async function updateFeedAnnouncementAdmin(
  id: string,
  input: UpdateFeedAnnouncementInput,
): Promise<FeedAnnouncement> {
  const response = await apiClient.patch<ApiSuccessResponse<FeedAnnouncement>>(
    `/admin/feed/announcements/${id}`,
    input,
  );
  return response.data.data;
}

export async function deleteFeedAnnouncementAdmin(id: string): Promise<void> {
  await apiClient.delete(`/admin/feed/announcements/${id}`);
}

export async function uploadFeedAnnouncementImageAdmin(
  id: string,
  file: File,
  onProgress?: (info: UploadProgressInfo) => void,
  signal?: AbortSignal,
): Promise<FeedAnnouncement> {
  const formData = new FormData();
  formData.append('file', file);
  const startedAt = Date.now();
  const response = await apiClient.post<ApiSuccessResponse<FeedAnnouncement>>(
    `/admin/feed/announcements/${id}/image`,
    formData,
    {
      signal,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        onProgress({
          percent: Math.round((event.loaded / event.total) * 100),
          loadedBytes: event.loaded,
          totalBytes: event.total,
          bytesPerSecond: elapsedSeconds > 0 ? event.loaded / elapsedSeconds : null,
        });
      },
    },
  );
  return response.data.data;
}

export async function removeFeedAnnouncementImageAdmin(id: string): Promise<FeedAnnouncement> {
  const response = await apiClient.delete<ApiSuccessResponse<FeedAnnouncement>>(
    `/admin/feed/announcements/${id}/image`,
  );
  return response.data.data;
}

// --- Live Preview (Phase 4C, Stage 1) -------------------------------------------------
// Read-only, never persists — runs the real ranking engine against a draft
// config + simulated persona. See LiveFeedPreview.tsx.

export async function previewFeedAdmin(input: PreviewFeedInput): Promise<PreviewFeedResult> {
  const response = await apiClient.post<ApiSuccessResponse<PreviewFeedResult>>('/admin/feed/preview', input);
  return response.data.data;
}

// --- Configuration History (Phase 4C, Stage 1) ----------------------------------------
// Lists via the existing generic audit-log endpoint, filtered to this
// feature's target_type — no bespoke history-listing endpoint.

export async function listFeedConfigHistoryAdmin(
  page = 1,
  limit = 20,
): Promise<{ data: FeedConfigHistoryEntry[]; meta: { total?: number; page?: number; hasNextPage?: boolean } }> {
  const response = await apiClient.get<ApiSuccessResponse<FeedConfigHistoryEntry[]>>('/admin/audit-logs', {
    params: { target_type: 'feed_config', page, limit },
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function rollbackFeedConfigAdmin(auditLogId: string): Promise<FeedConfig> {
  const response = await apiClient.post<ApiSuccessResponse<FeedConfig>>(
    `/admin/feed/config/rollback/${auditLogId}`,
  );
  return response.data.data;
}
