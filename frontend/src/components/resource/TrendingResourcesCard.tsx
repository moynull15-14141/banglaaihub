import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import { useResources } from '@/lib/hooks/useResources';

// Mirrors SimilarResourcesCard's shape — reuses the existing public resource
// listing (sort=trending, backed by resolveTrendingPage in
// resources.service.ts) rather than a dedicated trending endpoint.
export function TrendingResourcesCard() {
  const { data, isLoading } = useResources({ sort: 'trending', limit: 5 });
  const resources = data?.data ?? [];

  if (!isLoading && resources.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <TrendingUp className="size-4 text-brand" aria-hidden="true" />
        Trending this week
      </h2>
      <ul className="flex flex-col divide-y">
        {resources.map((resource) => (
          <li key={resource.id}>
            <Link
              href={resourceHref(resource.type, resource.slug)}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-brand"
            >
              <span className="min-w-0 truncate text-sm font-medium">{resource.title}</span>
              <Badge variant="outline" className="shrink-0">
                {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
