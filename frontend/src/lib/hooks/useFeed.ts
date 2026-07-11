'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { listFeed } from '@/lib/api/feed';
import type { FeedMode } from '@/types/feed';

const PAGE_SIZE = 20;

// Cursor-based (not offset, unlike most of this codebase's lists) — ranked
// order isn't a stable DB column, see backend/src/services/feed.service.ts's
// snapshot-cursor comment. `getNextPageParam` reads `meta.next_cursor`
// instead of computing page*limit<total, since the feed endpoint doesn't
// return a total.
export function useFeed(mode: FeedMode) {
  return useInfiniteQuery({
    queryKey: ['feed', mode],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listFeed({ mode, cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
  });
}
