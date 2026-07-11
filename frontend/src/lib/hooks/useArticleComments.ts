'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEditorialComment,
  deleteEditorialComment,
  listEditorialComments,
  resolveEditorialComment,
  type EditorialCommentKind,
} from '@/lib/api/articleWorkflow';

export function useEditorialComments(slug: string, kind?: EditorialCommentKind) {
  return useQuery({
    queryKey: ['articles', 'editorial-comments', slug, kind],
    queryFn: () => listEditorialComments(slug, kind),
    enabled: Boolean(slug),
  });
}

function useInvalidateEditorialComments(slug: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['articles', 'editorial-comments', slug] });
}

export function useCreateEditorialComment(slug: string) {
  const invalidate = useInvalidateEditorialComments(slug);
  return useMutation({
    mutationFn: (input: { content: string; kind?: EditorialCommentKind; parent_id?: string }) =>
      createEditorialComment(slug, input),
    onSuccess: invalidate,
  });
}

export function useResolveEditorialComment(slug: string) {
  const invalidate = useInvalidateEditorialComments(slug);
  return useMutation({
    mutationFn: ({ commentId, resolved }: { commentId: string; resolved: boolean }) =>
      resolveEditorialComment(commentId, resolved),
    onSuccess: invalidate,
  });
}

export function useDeleteEditorialComment(slug: string) {
  const invalidate = useInvalidateEditorialComments(slug);
  return useMutation({
    mutationFn: (commentId: string) => deleteEditorialComment(commentId),
    onSuccess: invalidate,
  });
}
