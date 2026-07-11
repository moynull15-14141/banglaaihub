'use client';

import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { checkSeoDuplicate, getSeoDashboard, type SeoDuplicateField } from '@/lib/api/seo';

// Debounced against the existing useDebounce hook (see
// frontend/src/lib/hooks/useDebounce.ts) — "SEO calculations must be
// lightweight, debounce expensive validation" per the brief; this is the
// only check in the SEO panel that needs a network round trip.
export function useSeoDuplicateCheck(field: SeoDuplicateField, value: string, excludeSlug?: string) {
  const debouncedValue = useDebounce(value.trim(), 500);

  return useQuery({
    queryKey: ['seo', 'duplicate-check', field, debouncedValue, excludeSlug],
    queryFn: ({ signal }) => checkSeoDuplicate(field, debouncedValue, excludeSlug, signal),
    enabled: debouncedValue.length > 0,
    staleTime: 30_000,
  });
}

export function useSeoDashboard() {
  return useQuery({
    queryKey: ['admin', 'seo', 'dashboard'],
    queryFn: getSeoDashboard,
  });
}
