import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import { useResources } from '@/lib/hooks/useResources';
import { slugify } from '@/lib/utils/slugify';
import type { ResourceType } from '@/types/resource';

interface SimilarResourcesCardProps {
  type: ResourceType;
  categorySlug: string | undefined;
  // Phase 3B — narrows "similar" to type + category + tag overlap, using
  // the same tags filter the browse views use (resourceTags some tag.slug
  // in [...] on the backend). Slugified client-side, same as TagBadge — the
  // list() endpoint filters by tag slug, not name.
  tags: string[];
  excludeSlug: string;
}

// Reuses the existing public resource listing (filtered to the same
// type + category + overlapping tags, sorted by popularity) rather than a
// dedicated "similar resources" recommendation endpoint.
export function SimilarResourcesCard({ type, categorySlug, tags, excludeSlug }: SimilarResourcesCardProps) {
  const tagSlugs = tags.slice(0, 3).map(slugify);
  const { data } = useResources({
    type,
    category: categorySlug,
    tags: tagSlugs.length > 0 ? tagSlugs : undefined,
    sort: 'popular',
    limit: 5,
  });
  const similar = (data?.data ?? []).filter((resource) => resource.slug !== excludeSlug).slice(0, 4);

  if (similar.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Similar resources</h2>
      <ul className="flex flex-col divide-y rounded-xl border border-border/60">
        {similar.map((resource) => (
          <li key={resource.id}>
            <Link
              href={resourceHref(resource.type, resource.slug)}
              className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50"
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
