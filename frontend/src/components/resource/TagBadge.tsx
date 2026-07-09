import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants/routes';
import { slugify } from '@/lib/utils/slugify';

interface TagBadgeProps {
  tag: string;
}

// Resource tags are carried as plain name strings (Resource/SearchResult's
// `tags: string[]`), not {name, slug} pairs — slugify() mirrors the exact
// normalization the backend applies when a tag is created (linkTags in
// resources.service.ts), so this resolves to the real /tags/[slug] route
// without a lookup round-trip.
export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link href={ROUTES.tag(slugify(tag))}>
      <Badge variant="secondary" className="hover:bg-secondary/80">
        {tag}
      </Badge>
    </Link>
  );
}
