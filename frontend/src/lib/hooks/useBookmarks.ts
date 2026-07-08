'use client';

import { useQuery } from '@tanstack/react-query';
import { listMyBookmarks, type ListMyBookmarksParams } from '@/lib/api/users';

export function useMyBookmarks(params: ListMyBookmarksParams = {}) {
  return useQuery({
    queryKey: ['users', 'me', 'bookmarks', params],
    queryFn: () => listMyBookmarks(params),
  });
}
