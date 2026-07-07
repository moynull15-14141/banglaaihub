'use client';

import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { useAdminPendingResources } from '@/lib/hooks/useAdmin';
import { ROUTES } from '@/lib/constants/routes';

export function PendingApprovalsCard() {
  const { data, isLoading, isError, refetch } = useAdminPendingResources({ limit: 5 });
  const resources = data?.data ?? [];

  return (
    <AdminListCard
      title="Pending approvals"
      viewAllHref={ROUTES.adminPending}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={resources.length === 0}
      emptyLabel="Nothing is waiting for review."
    >
      <ul className="flex flex-col divide-y">
        {resources.map((resource) => (
          <li key={resource.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{resource.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {resource.author?.display_name ?? resource.author?.username ?? 'Unknown author'} ·
                submitted{' '}
                {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {resource.type}
            </Badge>
          </li>
        ))}
      </ul>
    </AdminListCard>
  );
}
