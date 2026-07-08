'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string | null;
}

// Opens a PDF inside the site via an <iframe> (browsers render PDFs natively)
// instead of forcing a download — Part 4. `url` is a short-lived signed URL,
// fetched fresh right before opening (see AttachmentsSection), never cached.
export function PdfPreviewDialog({ open, onOpenChange, title, url }: PdfPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-2 p-4">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription className="sr-only">PDF preview</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border/60">
          {url ? (
            <iframe src={url} title={title} className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              Loading preview…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
