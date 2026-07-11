'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getHeatmap, listActivity } from '@/lib/api/activity';

const PAGE_SIZE = 20;

// Infinite scroll (Part 3's requirement) — pages accumulate via getNextPageParam.
export function useActivityFeed(username: string) {
  return useInfiniteQuery({
    queryKey: ['users', 'activity', username],
    queryFn: ({ pageParam }) => listActivity(username, { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page = 1, limit = PAGE_SIZE, total = 0 } = lastPage.meta;
      return page * limit < total ? page + 1 : undefined;
    },
    enabled: Boolean(username),
  });
}

export function useHeatmap(username: string, year?: number) {
  return useQuery({
    queryKey: ['users', 'heatmap', username, year],
    queryFn: () => getHeatmap(username, year),
    enabled: Boolean(username),
  });
}
