'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { acquireLock, forceReleaseLock, getLockStatus, releaseLock } from '@/lib/api/articleWorkflow';
import { useAuth } from '@/lib/hooks/useAuth';

// Poll-based, matching this codebase's existing convention (see
// useMessaging.ts/NotificationBell.tsx) — no WebSocket/SSE infrastructure
// exists anywhere in this project (confirmed before writing this), by
// documented design choice.
const LOCK_STATUS_POLL_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 20000;

export function useLockStatus(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['articles', 'lock', slug],
    queryFn: () => getLockStatus(slug),
    enabled: enabled && Boolean(slug),
    refetchInterval: enabled ? LOCK_STATUS_POLL_MS : false,
  });
}

// Acquires the lock on mount and heartbeats every 20s while the editor is
// open; releases on unmount. Returns whether the acquisition was rejected
// (someone else holds it) so the caller can show a view-only banner.
export function useArticleLockHeartbeat(slug: string, enabled: boolean) {
  const { user } = useAuth();
  const [rejected, setRejected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || !slug) return undefined;

    let cancelled = false;

    async function beat() {
      try {
        await acquireLock(slug);
        if (!cancelled) setRejected(false);
      } catch (error) {
        if (!cancelled && isAxiosError(error) && error.response?.status === 409) {
          setRejected(true);
        }
      }
    }

    void beat();
    intervalRef.current = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      void releaseLock(slug).catch(() => {});
    };
  }, [slug, enabled]);

  return { rejected, userId: user?.id };
}

export function useForceReleaseLock(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => forceReleaseLock(slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['articles', 'lock', slug] });
    },
  });
}
