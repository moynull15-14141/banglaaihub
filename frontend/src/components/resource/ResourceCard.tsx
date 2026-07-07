import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ResourceMeta } from '@/components/resource/ResourceMeta';
import { TagBadge } from '@/components/resource/TagBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { truncate } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';
import type { SearchResult } from '@/types/search';

const STATUS_BADGE_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  flagged: 'destructive',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  flagged: 'Flagged',
};

interface ResourceCardProps {
  resource: Resource | SearchResult;
  // Only meaningful for a contributor's own submissions (My Submissions) —
  // public listings only ever contain approved resources, so this stays off
  // by default rather than showing a redundant "Approved" badge everywhere.
  showStatus?: boolean;
}

export function ResourceCard({ resource, showStatus = false }: ResourceCardProps) {
  const author = resource.author;
  const authorName = author?.display_name ?? author?.username ?? null;
  // SearchResult's author DTO has no avatar_url — only Resource's does.
  const authorAvatarUrl = author && 'avatar_url' in author ? author.avatar_url : null;
  const href = resourceHref(resource.type, resource.slug);
  // SearchResult has no `status` field (the search index only ever contains
  // approved resources) — only Resource carries it.
  const status = 'status' in resource ? resource.status : null;

  return (
    <Card className="flex h-full flex-col overflow-hidden py-0">
      <Link href={href} className="block overflow-hidden">
        <div className="flex h-32 items-center justify-center overflow-hidden bg-muted">
          {resource.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied external URL, no fixed domain to allowlist for next/image
            <img
              src={resource.thumbnail_url}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          ) : (
            <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </Link>
      <CardHeader className="pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="brand">{RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}</Badge>
          {showStatus && status ? (
            <Badge variant={STATUS_BADGE_VARIANT[status] ?? 'secondary'}>
              {STATUS_LABEL[status] ?? status}
            </Badge>
          ) : null}
          {resource.category ? (
            <Link
              href={ROUTES.category(resource.category.slug)}
              className="text-xs text-muted-foreground hover:underline"
            >
              {resource.category.name}
            </Link>
          ) : null}
        </div>
        <Link href={href}>
          <h3 className="line-clamp-2 text-base font-semibold tracking-tight transition-colors group-hover/card:text-brand">
            {resource.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {resource.description ? (
          <p className="text-sm text-muted-foreground">{truncate(resource.description, 140)}</p>
        ) : null}
        {resource.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {resource.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 pt-2">
          {author && authorName ? (
            <Link
              href={ROUTES.userProfile(author.username)}
              className="flex items-center gap-2 text-sm hover:underline"
            >
              <UserAvatar avatarUrl={authorAvatarUrl} name={authorName} size="sm" />
              <span className="truncate">{authorName}</span>
            </Link>
          ) : null}
          <ResourceMeta
            viewCount={resource.view_count}
            downloadCount={resource.download_count}
            bookmarkCount={resource.bookmark_count}
            publishedAt={resource.published_at}
          />
        </div>
      </CardContent>
    </Card>
  );
}
