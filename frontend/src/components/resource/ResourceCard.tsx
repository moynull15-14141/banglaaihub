import Link from 'next/link';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { BookmarkX, ImageOff, Lock, Paperclip, Pencil, Trash2, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { ResourceMeta } from '@/components/resource/ResourceMeta';
import { TagBadge } from '@/components/resource/TagBadge';
import { PinResourceButton } from '@/components/user/PinResourceButton';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { RESOURCE_TYPE_LABELS, STATUS_BADGE_VARIANT, STATUS_LABEL } from '@/lib/constants/resourceTypes';
import { useDeleteResource, useToggleResourceBookmark } from '@/lib/hooks/useResources';
import { getFileBadgeLabel } from '@/lib/utils/fileIcons';
import { formatBytes, formatDate, truncate } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';
import type { SearchResult } from '@/types/search';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

const VISIBILITY_ICON = { public: null, unlisted: Unlock, private: Lock } as const;

interface ResourceCardProps {
  resource: Resource | SearchResult;
  // Only meaningful for a contributor's own submissions (My Submissions) —
  // public listings only ever contain approved resources, so this stays off
  // by default rather than showing a redundant "Approved" badge everywhere.
  showStatus?: boolean;
  // My Submissions only — Edit/Delete actions + visibility/last-updated footer.
  showOwnerActions?: boolean;
  // Bookmarks page only — a one-click "Remove" action instead of routing
  // through the resource detail page's toggle button.
  showBookmarkAction?: boolean;
}

export function ResourceCard({
  resource,
  showStatus = false,
  showOwnerActions = false,
  showBookmarkAction = false,
}: ResourceCardProps) {
  const author = resource.author;
  const authorName = author?.display_name ?? author?.username ?? null;
  // SearchResult's author DTO has no avatar_url — only Resource's does.
  const authorAvatarUrl = author && 'avatar_url' in author ? author.avatar_url : null;
  const href = resourceHref(resource.type, resource.slug);
  // SearchResult has no `status` field (the search index only ever contains
  // approved resources) — only Resource carries it.
  const status = 'status' in resource ? resource.status : null;
  // Same reasoning — attachments/visibility/updated_at only exist on the full Resource DTO.
  const attachments = 'attachments' in resource ? resource.attachments : [];
  const primaryAttachment = attachments[0] ?? null;
  const visibility = 'visibility' in resource ? resource.visibility : null;
  const updatedAt = 'updated_at' in resource ? resource.updated_at : null;
  const VisibilityIcon = visibility ? VISIBILITY_ICON[visibility] : null;

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const deleteMutation = useDeleteResource();
  const toggleBookmarkMutation = useToggleResourceBookmark(resource.slug);

  function handleRemoveBookmark() {
    toggleBookmarkMutation.mutate(
      { add: false },
      {
        onSuccess: () => toast.success('Bookmark removed.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not remove this bookmark.')),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(
      { slug: resource.slug },
      {
        onSuccess: () => {
          toast.success('Resource deleted.');
          setConfirmDeleteOpen(false);
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not delete this resource.')),
      },
    );
  }

  return (
    <Card className="flex h-full flex-col gap-3 overflow-hidden py-0 sm:gap-4">
      <Link href={href} className="block overflow-hidden">
        <div className="flex h-24 items-center justify-center overflow-hidden bg-muted sm:h-32">
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
      <CardHeader className="gap-1 pt-3 sm:pt-4">
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
      <CardContent className="flex flex-1 flex-col gap-2 sm:gap-3">
        {resource.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{truncate(resource.description, 140)}</p>
        ) : null}
        {resource.tags.length > 0 || attachments.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {resource.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
            {primaryAttachment ? (
              <Badge variant="outline" className="gap-1">
                <Paperclip className="size-3" aria-hidden="true" />
                {getFileBadgeLabel(primaryAttachment.extension)}
                {attachments.length > 1 ? ` +${attachments.length - 1}` : ''}
                {formatBytes(primaryAttachment.size_bytes) ? ` · ${formatBytes(primaryAttachment.size_bytes)}` : ''}
              </Badge>
            ) : null}
          </div>
        ) : null}
        <div className="mt-auto flex flex-col gap-2 pt-1 sm:gap-3 sm:pt-2">
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
            avgRating={resource.avg_rating}
            reviewCount={resource.review_count}
          />
          {showOwnerActions ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {VisibilityIcon ? (
                  <span className="flex items-center gap-1 capitalize">
                    <VisibilityIcon className="size-3" aria-hidden="true" />
                    {visibility}
                  </span>
                ) : null}
                {updatedAt ? <span>Updated {formatDate(updatedAt)}</span> : null}
              </div>
              <div className="flex items-center gap-1">
                <PinResourceButton resourceId={resource.id} />
                <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
                  <Link href={ROUTES.editResource(resource.slug)}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}
          {showBookmarkAction ? (
            <div className="flex items-center justify-end border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={toggleBookmarkMutation.isPending}
                onClick={handleRemoveBookmark}
              >
                <BookmarkX className="size-4" aria-hidden="true" />
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>

      {showOwnerActions ? (
        <ConfirmActionDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Delete this resource?"
          description={
            status === 'approved'
              ? 'This resource is live — it will be moved to trash and can be restored by an admin.'
              : 'This will permanently delete the resource and its attached files. This cannot be undone.'
          }
          confirmLabel="Delete"
          variant="destructive"
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
        />
      ) : null}
    </Card>
  );
}
