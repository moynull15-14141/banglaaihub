'use client';

import { useQuery } from '@tanstack/react-query';
import { getTagBySlug, listTags } from '@/lib/api/tags';

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });
}

export function useTag(slug: string) {
  return useQuery({
    queryKey: ['tags', 'detail', slug],
    queryFn: () => getTagBySlug(slug),
    enabled: Boolean(slug),
  });
}
