'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DownloadButton } from '@/components/resource/DownloadButton';
import { PdfPreviewDialog } from '@/components/resource/PdfPreviewDialog';
import { getResourceDownload } from '@/lib/api/resources';
import { getFileIcon, getFileBadgeLabel } from '@/lib/utils/fileIcons';
import { formatBytes, formatDate } from '@/lib/utils/format';
import type { ResourceAttachment } from '@/types/resource';

interface AttachmentsSectionProps {
  slug: string;
  attachments: ResourceAttachment[];
  priceCents?: number | null;
  currency?: 'BDT' | 'USD' | null;
  isPurchased?: boolean;
  isOwner?: boolean;
}

// Universal multi-file attachments list (Part 3) — every attachment shows an
// icon, filename, size, type, uploaded date, a Download button (signed URL,
// never a raw R2 key), and a Preview button for PDFs (in-browser, Part 4).
export function AttachmentsSection({
  slug,
  attachments,
  priceCents,
  currency,
  isPurchased,
  isOwner,
}: AttachmentsSectionProps) {
  const [previewFile, setPreviewFile] = useState<ResourceAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
            <div
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.display_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getFileBadgeLabel(file.extension)}
                    {formatBytes(file.size_bytes) ? ` · ${formatBytes(file.size_bytes)}` : ''}
                    {` · uploaded ${formatDate(file.uploaded_at)}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {file.extension.toLowerCase() === '.pdf' ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void handlePreview(file)}>
                    Preview
                  </Button>
                ) : null}
                <DownloadButton
                  slug={slug}
                  fileId={file.id}
                  label="Download"
                  variant="outline"
                  size="sm"
                  priceCents={priceCents}
                  currency={currency}
                  isPurchased={isPurchased}
                  isOwner={isOwner}
                />
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
