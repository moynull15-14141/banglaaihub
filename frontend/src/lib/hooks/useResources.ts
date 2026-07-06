'use client';

import { useQuery } from '@tanstack/react-query';
import { getResourceBySlug, listResources } from '@/lib/api/resources';
import type { ListResourcesParams } from '@/types/resource';

export function useResources(params: ListResourcesParams = {}) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: () => listResources(params),
  });
}

export function useResource(slug: string) {
  return useQuery({
    queryKey: ['resources', 'detail', slug],
    queryFn: () => getResourceBySlug(slug),
    enabled: Boolean(slug),
  });
}
