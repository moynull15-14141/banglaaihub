'use client';

import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { useAdminActivityFeed } from '@/lib/hooks/useAdmin';

function humanizeAction(action: string): string {
  return action
    .split(/[._]/)
    .filter(Boolean)
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ActivityFeedCard() {
  const { data, isLoading, isError, refetch } = useAdminActivityFeed(8);
  const logs = data?.data ?? [];

  return (
    <AdminListCard
      title="Activity feed"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={logs.length === 0}
      emptyLabel="No activity recorded yet."
    >
      <ul className="flex flex-col divide-y">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Activity className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">
                  {log.actor?.display_name ?? log.actor?.username ?? 'System'}
                </span>{' '}
                <span className="text-muted-foreground">{humanizeAction(log.action)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </AdminListCard>
  );
}
