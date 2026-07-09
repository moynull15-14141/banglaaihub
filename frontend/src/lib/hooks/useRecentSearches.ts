'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'banglaai:recent-searches';
const MAX_ENTRIES = 8;

function readStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

// No backend involved — a purely client-side convenience, same as any
// "recently viewed" list. Popular searches (the aggregate, cross-user
// equivalent) come from GET /search/popular instead (see useSearch.ts).
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readStorage());
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecent((previous) => {
      const next = [
        trimmed,
        ...previous.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_ENTRIES);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Best-effort only — localStorage may be unavailable (private mode, quota).
      }
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Best-effort only.
    }
  }, []);

  return { recent, addRecentSearch, clearRecentSearches };
}
