'use client';

import { useQuery } from '@tanstack/react-query';
import { search } from '@/lib/api/search';
import type { SearchParams } from '@/types/search';

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => search(params),
    enabled: params.q.trim().length > 0,
  });
}
