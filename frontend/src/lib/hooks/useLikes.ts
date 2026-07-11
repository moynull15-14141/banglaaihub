'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likeResource, unlikeResource } from '@/lib/api/likes';

// Same `add`-flag shape as useToggleResourceBookmark in useResources.ts.
export function useToggleResourceLike(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ add }: { add: boolean }) => (add ? likeResource(slug) : unlikeResource(slug)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
    },
  });
}
