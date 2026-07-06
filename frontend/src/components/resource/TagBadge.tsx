import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/constants/routes';

interface TagBadgeProps {
  tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link href={`${ROUTES.search}?q=${encodeURIComponent(tag)}`}>
      <Badge variant="secondary" className="hover:bg-secondary/80">
        {tag}
      </Badge>
    </Link>
  );
}
