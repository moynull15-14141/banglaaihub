import { apiClient } from '@/lib/api/client';
import type { UploadProgressInfo } from '@/lib/api/resources';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Post } from '@/types/post';

export type PostReportReason = 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate';

export interface ListPostsResult {
  data: Post[];
  meta: ResponseMeta;
}

export async function listPosts(params: { author?: string } = {}): Promise<ListPostsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Post[]>>('/posts', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function createPost(
  content: string,
  file?: File | null,
  onProgress?: (info: UploadProgressInfo) => void,
): Promise<Post> {
  const formData = new FormData();
  formData.append('content', content);
  if (file) formData.append('file', file);
  const startedAt = Date.now();
  const response = await apiClient.post<ApiSuccessResponse<Post>>('/posts', formData, {
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
  });
  return response.data.data;
}

export async function updatePost(id: string, content: string): Promise<Post> {
  const response = await apiClient.patch<ApiSuccessResponse<Post>>(`/posts/${id}`, { content });
  return response.data.data;
}

export async function deletePost(id: string): Promise<void> {
  await apiClient.delete(`/posts/${id}`);
}

export async function togglePostLike(id: string): Promise<{ liked: boolean }> {
  const response = await apiClient.post<ApiSuccessResponse<{ liked: boolean }>>(`/posts/${id}/like`);
  return response.data.data;
}

export async function reportPost(
  id: string,
  input: { reason: PostReportReason; description?: string },
): Promise<unknown> {
  const response = await apiClient.post<ApiSuccessResponse<unknown>>(`/posts/${id}/report`, input);
  return response.data.data;
}
