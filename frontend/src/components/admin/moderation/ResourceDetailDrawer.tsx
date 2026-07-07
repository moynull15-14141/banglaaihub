import { ImageOff } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { TagBadge } from '@/components/resource/TagBadge';
import { ResourceTypeMetadata } from '@/components/resource/ResourceTypeMetadata';
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

interface ResourceDetailDrawerProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Read-only preview of a resource for moderators — reuses the same
// ResourceTypeMetadata block the public resource-detail page renders, so
// dataset/paper/tool fields (and the public page's "download requires
// sign-in" placeholder) stay identical between the two surfaces.
export function ResourceDetailDrawer({ resource, open, onOpenChange }: ResourceDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        {resource ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{TYPE_LABELS[resource.type] ?? resource.type}</Badge>
                <StatusBadge status={resource.status} />
                {resource.featured ? <Badge variant="brand">Featured</Badge> : null}
              </div>
              <SheetTitle className="text-lg">{resource.title}</SheetTitle>
              <SheetDescription>
                Submitted {formatDate(resource.created_at)}
                {resource.category ? ` · ${resource.category.name}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {resource.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied external URL, no fixed domain to allowlist for next/image
                  <img
                    src={resource.thumbnail_url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />
                )}
              </div>

              {resource.author ? (
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={resource.author.avatar_url}
                    name={resource.author.display_name ?? resource.author.username}
                    className="size-8"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {resource.author.display_name ?? resource.author.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{resource.author.username}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unknown author</p>
              )}

              {resource.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {resource.description}
                </p>
              ) : null}

              {resource.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {resource.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              ) : null}

              <ResourceTypeMetadata resource={resource} />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
