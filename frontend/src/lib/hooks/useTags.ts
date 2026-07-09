'use client';

import { useQuery } from '@tanstack/react-query';
import { getTagBySlug, listTags, searchTags } from '@/lib/api/tags';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });
}

export function useTagSearch(q: string) {
  return useQuery({
    queryKey: ['tags', 'search', q],
    queryFn: () => searchTags(q),
    enabled: q.trim().length > 0,
  });
}

export function useTag(slug: string) {
  return useQuery({
    queryKey: ['tags', 'detail', slug],
    queryFn: () => getTagBySlug(slug),
    enabled: Boolean(slug),
  });
}
