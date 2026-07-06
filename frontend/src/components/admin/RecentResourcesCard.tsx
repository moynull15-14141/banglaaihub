'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { useResources } from '@/lib/hooks/useResources';
import { resourceHref, ROUTES } from '@/lib/constants/routes';

export function RecentResourcesCard() {
  const { data, isLoading, isError, refetch } = useResources({ sort: 'newest', limit: 5 });
  const resources = data?.data ?? [];

  return (
    <AdminListCard
      title="Recent resources"
      viewAllHref={ROUTES.resources}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={resources.length === 0}
      emptyLabel="No resources have been published yet."
    >
      <ul className="flex flex-col divide-y">
        {resources.map((resource) => (
          <li key={resource.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <Link
                href={resourceHref(resource.type, resource.slug)}
                className="block truncate text-sm font-medium hover:underline"
              >
                {resource.title}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {resource.author?.display_name ?? resource.author?.username ?? 'Unknown author'} ·{' '}
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
