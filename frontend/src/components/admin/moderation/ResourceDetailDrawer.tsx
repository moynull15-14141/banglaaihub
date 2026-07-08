import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ImageOff, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagBadge } from '@/components/resource/TagBadge';
import { ResourceTypeMetadata } from '@/components/resource/ResourceTypeMetadata';
import { DownloadButton } from '@/components/resource/DownloadButton';
import { PdfPreviewDialog } from '@/components/resource/PdfPreviewDialog';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useDeleteResourceAttachment } from '@/lib/hooks/useResources';
import { getResourceDownload } from '@/lib/api/resources';
import { getFileIcon, getFileBadgeLabel } from '@/lib/utils/fileIcons';
import { formatBytes, formatDate } from '@/lib/utils/format';
import type { Resource, ResourceAttachment } from '@/types/resource';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

// Admin-only file panel (Part 13) — same attachments the public/edit views
// use, plus checksum + a masked storage location, and a delete action.
function AdminAttachmentsPanel({ slug, attachments }: { slug: string; attachments: ResourceAttachment[] }) {
  const [previewFile, setPreviewFile] = useState<ResourceAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const deleteMutation = useDeleteResourceAttachment(slug);

  if (attachments.length === 0) return null;

  async function handlePreview(file: ResourceAttachment) {
    setPreviewFile(file);
    setPreviewUrl(null);
    const { url } = await getResourceDownload(slug, file.id);
    setPreviewUrl(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Attachments
          <Badge variant="secondary" className="ml-2">
            {attachments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {attachments.map((file) => {
          const Icon = getFileIcon(file.extension);
          return (
            <div key={file.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">{file.display_name}</span>
                <Badge variant="outline">{getFileBadgeLabel(file.extension)}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <dt>Size</dt>
                <dd className="text-right">{formatBytes(file.size_bytes) ?? '—'}</dd>
                <dt>Checksum</dt>
                <dd className="truncate text-right font-mono" title={file.checksum_sha256}>
                  {file.checksum_sha256.slice(0, 16)}…
                </dd>
                <dt>Uploaded</dt>
                <dd className="text-right">{formatDate(file.uploaded_at)}</dd>
                <dt>Storage location</dt>
                <dd className="truncate text-right font-mono">R2 · {slug}/…{file.extension}</dd>
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                {file.extension.toLowerCase() === '.pdf' ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void handlePreview(file)}>
                    Preview
                  </Button>
                ) : null}
                <DownloadButton slug={slug} fileId={file.id} label="Download" variant="outline" size="sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={deleteMutation.isPending}
                  onClick={() =>
                    deleteMutation.mutate(file.id, {
                      onSuccess: () => toast.success('Attachment deleted.'),
                      onError: (error) => toast.error(errorMessage(error, 'Could not delete this attachment.')),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <PdfPreviewDialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setPreviewUrl(null);
          }
        }}
        title={previewFile?.display_name ?? ''}
        url={previewUrl}
      />
    </Card>
  );
}

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

              <AdminAttachmentsPanel slug={resource.slug} attachments={resource.attachments} />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
