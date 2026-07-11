'use client';

import { ActivityItem } from '@/components/user/ActivityItem';
import { Button } from '@/components/ui/button';
import { useActivityFeed } from '@/lib/hooks/useActivity';

interface ActivityFeedProps {
  username: string;
}

export function ActivityFeed({ username }: ActivityFeedProps) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useActivityFeed(username);
  const activities = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading activity…</p>;
  }

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      {hasNextPage ? (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
