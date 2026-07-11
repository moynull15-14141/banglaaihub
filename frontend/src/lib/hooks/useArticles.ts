'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveArticle, publishArticle } from '@/lib/api/resources';
import type { PublishArticleInput } from '@/types/resource';

// Mirrors useResources.ts's useInvalidateResource() — publish/archive both
// change the resource's own status, so the same two query keys need
// invalidating (the detail view and the admin/author's article list).
function useInvalidateArticle(slug: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
    void queryClient.invalidateQueries({ queryKey: ['resources'] });
  };
}

export function usePublishArticle(slug: string) {
  const invalidate = useInvalidateArticle(slug);
  return useMutation({
    mutationFn: (input: PublishArticleInput = {}) => publishArticle(slug, input),
    onSuccess: invalidate,
  });
}

export function useArchiveArticle(slug: string) {
  const invalidate = useInvalidateArticle(slug);
  return useMutation({
    mutationFn: () => archiveArticle(slug),
    onSuccess: invalidate,
  });
}
