'use client';

import { useCallback, useRef } from 'react';
import { recordImpressions } from '@/lib/api/feed';

// Module-scoped (not per-hook-instance) so every FeedCard on the page
// shares one batch queue — a scroll past 10 cards fires one network call,
// not ten. Resets on reload, which is fine: the backend upserts and
// increments impressionCount either way (see FeedService.recordImpressions),
// so a re-send after a reload just adds to the same running count rather
// than duplicating a row.
const FLUSH_INTERVAL_MS = 2000;
const FLUSH_BATCH_SIZE = 20;

let queue: Set<string> = new Set();
const sentThisSession: Set<string> = new Set();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.size === 0) return;
  const ids = Array.from(queue);
  queue = new Set();
  // Best-effort, fire-and-forget — same pattern as the codebase's other
  // non-critical analytics writes (search logging, index sync): a failed
  // impression report shouldn't surface as a user-facing error.
  recordImpressions(ids).catch(() => {});
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

function reportImpression(resourceId: string): void {
  if (sentThisSession.has(resourceId)) return;
  sentThisSession.add(resourceId);
  queue.add(resourceId);
  if (queue.size >= FLUSH_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

// Attach the returned ref to a resource-backed feed card's root element.
// Fires once per resourceId per page session, the first time the card
// crosses 50% visibility — not on every scroll re-entry. useCallback keyed
// on resourceId keeps the ref callback identity stable across re-renders
// (React re-fires a ref callback whenever its identity changes), so a
// parent re-render doesn't tear down and recreate the IntersectionObserver.
export function useImpressionObserver(resourceId: string | null): React.RefCallback<HTMLElement> {
  const reportedRef = useRef(false);

  return useCallback(
    (node: HTMLElement | null) => {
      if (!node || !resourceId || reportedRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !reportedRef.current) {
            reportedRef.current = true;
            reportImpression(resourceId);
            observer.disconnect();
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(node);
    },
    [resourceId],
  );
}
