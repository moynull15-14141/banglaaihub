'use client';

import { useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { FeedCard } from '@/components/feed/FeedCard';
import { useFeed } from '@/lib/hooks/useFeed';
import type { FeedMode } from '@/types/feed';

export function FeedList({ mode }: { mode: FeedMode }) {
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(mode);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <CardGridSkeleton count={9} />;
  }

  if (isError) {
    // For You/Following are only ever requested for a signed-in user (see
    // FeedModeTabs), so a 401 here means the session expired mid-scroll,
    // not a routing mistake — a distinct message beats the generic one.
    const isAuthError = isAxiosError(error) && error.response?.status === 401;
    return (
      <ErrorState
        title={isAuthError ? 'Sign in to see this feed' : "Couldn't load the feed"}
        description={
          isAuthError
            ? 'Your session may have expired. Sign in again to continue.'
            : 'Something went wrong while fetching the feed.'
        }
        onRetry={isAuthError ? undefined : () => void refetch()}
      />
    );
  }

  // Backstop against duplicate cards across pages (e.g. a cache snapshot
  // expiring mid-scroll restarts ranking from the top) — the cursor design
  // avoids this in the common case, but a client-side dedup pass costs
  // nothing and fully closes the gap.
  const seen = new Set<string>();
  const cards = (data?.pages.flatMap((page) => page.data) ?? []).filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });

  if (cards.length === 0) {
    return mode === 'following' ? (
      <EmptyResults
        title="Follow someone to see their activity here"
        description="Resources from contributors you follow will show up in this tab."
      />
    ) : (
      <EmptyResults title="Nothing here yet" description="Check back soon, or browse resources directly." />
    );
  }

  return (
    <div role="feed" aria-busy={isFetchingNextPage} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <FeedCard key={card.id} card={card} />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {isFetchingNextPage ? 'Loading more items…' : `${cards.length} items loaded`}
      </span>
      {hasNextPage ? (
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      ) : null}
      {isFetchingNextPage ? <CardGridSkeleton count={3} /> : null}
    </div>
  );
}
