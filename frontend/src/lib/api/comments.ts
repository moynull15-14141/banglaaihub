import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Comment, CreateCommentInput, ListCommentsParams, UpdateCommentInput } from '@/types/comment';

export interface ListCommentsResult {
  data: Comment[];
  meta: ResponseMeta;
}

export async function listComments(
  slug: string,
  params: ListCommentsParams = {},
): Promise<ListCommentsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Comment[]>>(
    `/resources/${encodeURIComponent(slug)}/comments`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function createComment(slug: string, input: CreateCommentInput): Promise<Comment> {
  const response = await apiClient.post<ApiSuccessResponse<Comment>>(
    `/resources/${encodeURIComponent(slug)}/comments`,
    input,
  );
  return response.data.data;
}

export async function updateComment(commentId: string, input: UpdateCommentInput): Promise<Comment> {
  const response = await apiClient.put<ApiSuccessResponse<Comment>>(
    `/comments/${encodeURIComponent(commentId)}`,
    input,
  );
  return response.data.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${encodeURIComponent(commentId)}`);
}

// Toggle — server decides like vs. unlike based on current state.
export async function toggleCommentLike(commentId: string): Promise<{ liked: boolean }> {
  const response = await apiClient.post<ApiSuccessResponse<{ liked: boolean }>>(
    `/comments/${encodeURIComponent(commentId)}/upvote`,
  );
  return response.data.data;
}

export type ReportReason = 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate';

export async function reportComment(
  commentId: string,
  input: { reason: ReportReason; description?: string },
): Promise<void> {
  await apiClient.post(`/comments/${encodeURIComponent(commentId)}/report`, input);
}
