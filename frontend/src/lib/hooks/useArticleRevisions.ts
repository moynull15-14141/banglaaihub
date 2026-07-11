'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { compareRevisions, listRevisions, restoreRevision } from '@/lib/api/articleWorkflow';

// Revision lists can grow unbounded over an article's lifetime — loaded
// lazily (only when the panel is actually opened, via `enabled`), matching
// the brief's "lazy loading" performance requirement for revision history.
export function useArticleRevisions(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['articles', 'revisions', slug],
    queryFn: () => listRevisions(slug),
    enabled: enabled && Boolean(slug),
  });
}

export function useCompareRevisions(revisionIdA: string | null, revisionIdB: string | null) {
  return useQuery({
    queryKey: ['articles', 'revisions', 'compare', revisionIdA, revisionIdB],
    queryFn: () => compareRevisions(revisionIdA as string, revisionIdB as string),
    enabled: Boolean(revisionIdA) && Boolean(revisionIdB) && revisionIdA !== revisionIdB,
  });
}

export function useRestoreRevision(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (revisionId: string) => restoreRevision(revisionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
      void queryClient.invalidateQueries({ queryKey: ['articles', 'revisions', slug] });
    },
  });
}
