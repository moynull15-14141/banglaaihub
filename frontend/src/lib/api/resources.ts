import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type {
  CreateResourceInput,
  CreateResourceResult,
  ListResourcesParams,
  Resource,
  UploadKind,
} from '@/types/resource';

export interface ListResourcesResult {
  data: Resource[];
  meta: ResponseMeta;
}

export async function listResources(params: ListResourcesParams = {}): Promise<ListResourcesResult> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/resources', { params });
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

// GET /resources/:slug/download — a plain redirecting URL, not a JSON call;
// used directly as an <a href> so the browser follows the 302 to a signed
// R2 URL itself (no raw key ever touches the frontend).
export function resourceDownloadUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/api/v1/resources/${encodeURIComponent(slug)}/download`;
}

// POST /resources/:slug/share — logs a ResourceAnalytics 'share' event.
// Fire-and-forget from the caller's perspective; never blocks the actual
// share action (opening a share link / copying to clipboard).
export async function logResourceShare(slug: string): Promise<void> {
  await apiClient.post(`/resources/${encodeURIComponent(slug)}/share`);
}
