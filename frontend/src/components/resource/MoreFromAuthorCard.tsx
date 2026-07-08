import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import { usePublicProfile } from '@/lib/hooks/usePublicProfile';

interface MoreFromAuthorCardProps {
  username: string;
  authorName: string;
  excludeSlug: string;
}

// Reuses the existing public-profile endpoint (already returns the author's
// up-to-10 most recent published resources) rather than adding a new
// "resources by author" endpoint just for this.
export function MoreFromAuthorCard({ username, authorName, excludeSlug }: MoreFromAuthorCardProps) {
  const { data: profile } = usePublicProfile(username);
  const others = (profile?.resources ?? []).filter((resource) => resource.slug !== excludeSlug).slice(0, 4);

  if (others.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">More from {authorName}</h2>
      <ul className="flex flex-col divide-y rounded-xl border border-border/60">
        {others.map((resource) => (
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
