import { Eye, Flag, MoreHorizontal, RotateCcw, Star, StarOff, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { formatDate } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';

const TYPE_LABELS: Record<string, string> = {
  dataset: 'Dataset',
  paper: 'Paper',
  tool: 'Tool',
  tutorial: 'Tutorial',
  prompt: 'Prompt',
  project: 'Project',
  news: 'News',
};

export interface ModerationRowActions {
  onView: (resource: Resource) => void;
  onApprove: (resource: Resource) => void;
  onReject: (resource: Resource) => void;
  onFeature: (resource: Resource) => void;
  onUnfeature: (resource: Resource) => void;
  onRestore: (resource: Resource) => void;
}

function RowActionsMenu({
  resource,
  onView,
  onApprove,
  onReject,
  onFeature,
  onUnfeature,
  onRestore,
}: ModerationRowActions & { resource: Resource }) {
  // A soft-deleted resource can only be restored — approve/reject/feature
  // all act on a live resource and don't apply until it's back.
  if (resource.deleted_at) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${resource.title}`}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(resource)}>
            <Eye className="size-4" aria-hidden="true" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRestore(resource)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Restore
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${resource.title}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(resource)}>
          <Eye className="size-4" aria-hidden="true" />
          View details
        </DropdownMenuItem>
        {resource.status !== 'approved' ? (
          <DropdownMenuItem onClick={() => onApprove(resource)}>
            <ThumbsUp className="size-4" aria-hidden="true" />
            Approve
          </DropdownMenuItem>
        ) : null}
        {resource.status !== 'rejected' ? (
          <DropdownMenuItem onClick={() => onReject(resource)} variant="destructive">
            <ThumbsDown className="size-4" aria-hidden="true" />
            Reject
          </DropdownMenuItem>
        ) : null}
        {resource.featured ? (
          <DropdownMenuItem onClick={() => onUnfeature(resource)}>
            <StarOff className="size-4" aria-hidden="true" />
            Unfeature
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onFeature(resource)}>
            <Star className="size-4" aria-hidden="true" />
            Feature
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface ModerationTableProps extends ModerationRowActions {
  resources: Resource[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ModerationTable({
  resources,
  isLoading,
  isError,
  onRetry,
  ...actions
}: ModerationTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load resources"
        description="Something went wrong while fetching the moderation queue."
        onRetry={onRetry}
      />
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title="Nothing here"
        description="No resources match the current filters."
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-xs text-muted-foreground backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Title
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Type
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Author
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Category
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Created
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {resources.map((resource) => (
              <tr key={resource.id} className="hover:bg-muted/30">
                <td className="max-w-64 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => actions.onView(resource)}
                    className="line-clamp-1 text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {resource.title}
                  </button>
                  {resource.featured ? (
                    <Badge variant="brand" className="ml-2">
                      Featured
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{TYPE_LABELS[resource.type] ?? resource.type}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {resource.author ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        avatarUrl={resource.author.avatar_url}
                        name={resource.author.display_name ?? resource.author.username}
                        className="size-6"
                      />
                      <span className="max-w-32 truncate">
                        {resource.author.display_name ?? resource.author.username}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {resource.category?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {resource.deleted_at ? (
                    <Badge variant="destructive">Deleted</Badge>
                  ) : (
                    <StatusBadge status={resource.status} />
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(resource.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu resource={resource} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {resources.map((resource) => (
          <Card key={resource.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => actions.onView(resource)}
                  className="line-clamp-2 text-left text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {resource.title}
                </button>
                <RowActionsMenu resource={resource} {...actions} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{TYPE_LABELS[resource.type] ?? resource.type}</Badge>
                {resource.deleted_at ? (
                  <Badge variant="destructive">Deleted</Badge>
                ) : (
                  <StatusBadge status={resource.status} />
                )}
                {resource.featured ? <Badge variant="brand">Featured</Badge> : null}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {resource.author?.display_name ?? resource.author?.username ?? 'Unknown author'}
                </span>
                <span>{formatDate(resource.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
