'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAvailableTransitions, transitionArticle } from '@/lib/api/articleWorkflow';
import type { ResourceStatus } from '@/types/resource';

export function useAvailableTransitions(slug: string) {
  return useQuery({
    queryKey: ['articles', 'workflow-transitions', slug],
    queryFn: () => getAvailableTransitions(slug),
    enabled: Boolean(slug),
  });
}

export function useTransitionArticle(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toStatus: ResourceStatus) => transitionArticle(slug, toStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
      void queryClient.invalidateQueries({ queryKey: ['articles', 'workflow-transitions', slug] });
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
