'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { useMySubmissions } from '@/lib/hooks/useMySubmissions';

const STATUS_BADGE_VARIANT: Record<string, 'warning' | 'success' | 'destructive'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  flagged: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  flagged: 'Flagged',
};

// Dashboard "latest submissions" widget — reuses the same
// GET /users/me/submissions endpoint and AdminListCard shell already used
// elsewhere for compact list widgets, rather than a new component/API.
export function RecentSubmissionsCard() {
  const { data, isLoading, isError, refetch } = useMySubmissions({ limit: 4 });
  const submissions = data?.data ?? [];

  return (
    <AdminListCard
      title="Recent submissions"
      viewAllHref={ROUTES.mySubmissions}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={submissions.length === 0}
      emptyLabel="You haven't submitted anything yet."
    >
      <ul className="flex flex-col divide-y">
        {submissions.map((resource) => (
          <li key={resource.id} className="flex items-center justify-between gap-3 py-2.5">
            <Link
              href={resourceHref(resource.type, resource.slug)}
              className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
            >
              {resource.title}
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT[resource.status] ?? 'secondary'}>
                {STATUS_LABEL[resource.status] ?? resource.status}
              </Badge>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </AdminListCard>
  );
}
