'use client';

import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 500;

// Browser-only autosave — no backend, no database draft table, per Phase
// 2B.1's explicit instruction. A convenience only: every read/write is
// wrapped since localStorage can throw (private browsing, quota, disabled
// storage) and losing autosave should never break the form itself.

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — autosave is best-effort
  }
}

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function useAutosaveDraft<T>(key: string, value: T, enabled: boolean): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => saveDraft(key, value), DEBOUNCE_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, value, enabled]);
}
