'use client';

import { useQuery } from '@tanstack/react-query';
import { getLicenseFacets, getPopularSearches, getSearchSuggestions, search } from '@/lib/api/search';
import type { SearchParams } from '@/types/search';

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: ({ signal }) => search(params, signal),
    enabled: params.q.trim().length > 0,
  });
}

// Autocomplete — deliberately not debounced here; SearchBar debounces the
// value it passes in, this hook just fetches whatever it's given.
export function useSearchSuggestions(q: string) {
  return useQuery({
    queryKey: ['search', 'suggest', q],
    queryFn: ({ signal }) => getSearchSuggestions(q, signal),
    enabled: q.trim().length > 0,
    staleTime: 30_000,
  });
}

export function usePopularSearches(days?: number, limit?: number) {
  return useQuery({
    queryKey: ['search', 'popular', days, limit],
    queryFn: () => getPopularSearches(days, limit),
    staleTime: 60_000,
  });
}

export function useLicenseFacets() {
  return useQuery({
    queryKey: ['search', 'filters', 'licenses'],
    queryFn: getLicenseFacets,
    staleTime: 5 * 60_000,
  });
}
