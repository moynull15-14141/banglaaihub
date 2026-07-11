'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createComment,
  deleteComment,
  listComments,
  reportComment,
  toggleCommentLike,
  updateComment,
  type ReportReason,
} from '@/lib/api/comments';
import type { CreateCommentInput, ListCommentsParams, UpdateCommentInput } from '@/types/comment';

export function useComments(slug: string, params: ListCommentsParams = {}) {
  return useQuery({
    queryKey: ['comments', slug, params],
    queryFn: () => listComments(slug, params),
    enabled: Boolean(slug),
  });
}

function useInvalidateComments(slug: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['comments', slug] });
  };
}

export function useCreateComment(slug: string) {
  const invalidate = useInvalidateComments(slug);
  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(slug, input),
    onSuccess: invalidate,
  });
}

export function useUpdateComment(slug: string) {
  const invalidate = useInvalidateComments(slug);
  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateCommentInput }) =>
      updateComment(commentId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteComment(slug: string) {
  const invalidate = useInvalidateComments(slug);
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: invalidate,
  });
}

export function useToggleCommentLike(slug: string) {
  const invalidate = useInvalidateComments(slug);
  return useMutation({
    mutationFn: (commentId: string) => toggleCommentLike(commentId),
    onSuccess: invalidate,
  });
}

export function useReportComment() {
  return useMutation({
    mutationFn: ({
      commentId,
      input,
    }: {
      commentId: string;
      input: { reason: ReportReason; description?: string };
    }) => reportComment(commentId, input),
  });
}
