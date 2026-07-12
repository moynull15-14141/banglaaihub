import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type {
  CreateResourceInput,
  CreateResourceResult,
  ListResourcesParams,
  PublishArticleInput,
  Resource,
  ResourceAttachment,
  ResourceVersionEntry,
  UpdateResourceInput,
  UploadKind,
} from '@/types/resource';

export interface ListResourcesResult {
  data: Resource[];
  meta: ResponseMeta;
}

export async function listResources(
  params: ListResourcesParams = {},
  signal?: AbortSignal,
): Promise<ListResourcesResult> {
  const { tags, ...rest } = params;
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/resources', {
    // Backend expects a single comma-separated string (see
    // commaSeparatedTags in resource.validator.ts), not axios's default
    // repeated-key array serialization.
    params: { ...rest, tags: tags && tags.length > 0 ? tags.join(',') : undefined },
    signal,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getResourceBySlug(slug: string): Promise<Resource> {
  const response = await apiClient.get<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}`,
  );
  return response.data.data;
}

// POST /resources — the single, existing resource-creation endpoint (doc 11).
// Handles every type; dataset/paper/tool metadata rides along in the same
// request body per createResourceSchema.
export async function createResource(input: CreateResourceInput): Promise<CreateResourceResult> {
  const response = await apiClient.post<ApiSuccessResponse<CreateResourceResult>>('/resources', input);
  return response.data.data;
}

// PUT /resources/:slug — editing an approved resource resets it to `pending`
// server-side (see resources.service.ts's `resubmitting` logic); the caller
// doesn't need to do anything special, the returned Resource already
// reflects the new status.
export async function updateResource(slug: string, input: UpdateResourceInput): Promise<Resource> {
  const response = await apiClient.put<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}`,
    input,
  );
  return response.data.data;
}

// DELETE /resources/:slug?force= — pending/rejected are hard-deleted
// server-side automatically; `force=true` is only honored for someone
// holding resource:delete_any (checked server-side, not here).
export async function deleteResource(slug: string, force = false): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}`, {
    params: force ? { force: 'true' } : undefined,
  });
}

export async function addResourceBookmark(slug: string): Promise<void> {
  await apiClient.post(`/resources/${encodeURIComponent(slug)}/bookmark`);
}

export async function removeResourceBookmark(slug: string): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/bookmark`);
}

export type ReportReason = 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate';

export async function reportResource(
  slug: string,
  input: { reason: ReportReason; description?: string },
): Promise<void> {
  await apiClient.post(`/resources/${encodeURIComponent(slug)}/report`, input);
}

export interface UploadProgressInfo {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number | null;
}

// POST /resources/:slug/upload?kind=... — the single, existing upload
// endpoint, extended (not duplicated) to also accept thumbnail/pdf/asset/
// documentation uploads alongside the original dataset-file case. `kind`
// defaults to 'dataset' server-side too, so existing callers that never
// passed it keep working unchanged.
export async function uploadResourceFile(
  slug: string,
  file: File,
  onProgress?: (info: UploadProgressInfo) => void,
  signal?: AbortSignal,
  kind: UploadKind = 'dataset',
): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const startedAt = Date.now();
  const response = await apiClient.post<ApiSuccessResponse<{ file_url: string }>>(
    `/resources/${encodeURIComponent(slug)}/upload?kind=${kind}`,
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

export interface ResourceDownloadInfo {
  url: string;
  filename: string;
  size_bytes: string | null;
}

// GET /resources/:slug/download?file_id= — a JSON call, not a redirect (Part
// 5's download-UX rewrite): issuing the URL no longer counts as "downloaded"
// by itself (see confirmResourceDownload below). Omit fileId for the
// resource's legacy primary file (dataset/tool/paper).
export async function getResourceDownload(slug: string, fileId?: string): Promise<ResourceDownloadInfo> {
  const response = await apiClient.get<ApiSuccessResponse<ResourceDownloadInfo>>(
    `/resources/${encodeURIComponent(slug)}/download`,
    { params: fileId ? { file_id: fileId } : undefined },
  );
  return response.data.data;
}

// POST /resources/:slug/download/confirm?file_id= — call once the signed URL
// from getResourceDownload() has actually been handed to the browser. This
// is what increments download_count / writes the analytics event.
export async function confirmResourceDownload(slug: string, fileId?: string): Promise<void> {
  await apiClient.post(
    `/resources/${encodeURIComponent(slug)}/download/confirm`,
    undefined,
    { params: fileId ? { file_id: fileId } : undefined },
  );
}

// GET /resources/:slug/preview — a small "look before you pay" content
// snippet for the checkout page, no purchase required.
export interface ResourcePreview {
  available: boolean;
  content: string | null;
  truncated: boolean;
}

export async function getResourcePreview(slug: string): Promise<ResourcePreview> {
  const response = await apiClient.get<ApiSuccessResponse<ResourcePreview>>(
    `/resources/${encodeURIComponent(slug)}/preview`,
  );
  return response.data.data;
}

// POST /resources/:slug/purchase — opens an SSLCommerz session for a priced
// resource; returns the gateway's own hosted payment page URL for a full
// browser redirect (never build a custom card form for this).
export async function purchaseResource(slug: string): Promise<{ gateway_url: string }> {
  const response = await apiClient.post<ApiSuccessResponse<{ gateway_url: string }>>(
    `/resources/${encodeURIComponent(slug)}/purchase`,
  );
  return response.data.data;
}

// POST /resources/:slug/share — logs a ResourceAnalytics 'share' event.
// Fire-and-forget from the caller's perspective; never blocks the actual
// share action (opening a share link / copying to clipboard).
export async function logResourceShare(slug: string): Promise<void> {
  await apiClient.post(`/resources/${encodeURIComponent(slug)}/share`);
}

// POST /resources/:slug/fork — Phase 3A.1. Reuses the exact same
// CreateResourceResult shape as createResource() above (it's the same
// service-layer create() call server-side, just pre-filled from the source
// prompt) — the caller redirects to the returned slug's edit page.
export async function forkResource(slug: string): Promise<CreateResourceResult> {
  const response = await apiClient.post<ApiSuccessResponse<CreateResourceResult>>(
    `/resources/${encodeURIComponent(slug)}/fork`,
  );
  return response.data.data;
}

// GET /resources/:slug/versions — Phase 3A.1. Ordered oldest-to-newest;
// empty array means "no version history to show" (0 or 1 total entries).
export async function getResourceVersions(slug: string): Promise<ResourceVersionEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<ResourceVersionEntry[]>>(
    `/resources/${encodeURIComponent(slug)}/versions`,
  );
  return response.data.data;
}

// --- Attachments (ResourceFile) --------------------------------------------
// Additive on top of uploadResourceFile() above — a separate, parallel
// multi-file capability, not a replacement for the single-slot flow.

export async function addResourceAttachment(
  slug: string,
  file: File,
  onProgress?: (info: UploadProgressInfo) => void,
  displayName?: string,
): Promise<ResourceAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const startedAt = Date.now();
  const response = await apiClient.post<ApiSuccessResponse<ResourceAttachment>>(
    `/resources/${encodeURIComponent(slug)}/attachments`,
    formData,
    {
      params: displayName ? { display_name: displayName } : undefined,
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

export async function deleteResourceAttachment(slug: string, fileId: string): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/attachments/${encodeURIComponent(fileId)}`);
}

export async function replaceResourceAttachment(
  slug: string,
  fileId: string,
  file: File,
): Promise<ResourceAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.put<ApiSuccessResponse<ResourceAttachment>>(
    `/resources/${encodeURIComponent(slug)}/attachments/${encodeURIComponent(fileId)}`,
    formData,
  );
  return response.data.data;
}

export async function reorderResourceAttachments(slug: string, fileIds: string[]): Promise<void> {
  await apiClient.patch(`/resources/${encodeURIComponent(slug)}/attachments/reorder`, {
    file_ids: fileIds,
  });
}

// --- Content Platform (Phase 5A-1) — article publish/schedule/archive -----

// POST /resources/:slug/publish — immediate publish when scheduled_at is
// omitted, or a future schedule (status becomes `scheduled`, flipped to
// `approved` by the backend's scheduled-publish job once due) otherwise.
export async function publishArticle(slug: string, input: PublishArticleInput = {}): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}/publish`,
    input,
  );
  return response.data.data;
}

export async function archiveArticle(slug: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}/archive`,
  );
  return response.data.data;
}
