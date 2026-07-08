'use client';

import { CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { useDownloadResource } from '@/lib/hooks/useResources';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface DownloadButtonProps {
  slug: string;
  fileId?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon-sm';
}

// Downloading.../Completed download UX (Part 5) — the actual byte transfer
// happens as a direct browser navigation to a signed R2 URL (cross-origin,
// so true progress can't be observed from the page); "Preparing…" covers the
// URL-issuing round trip, and "Downloaded" confirms the browser was handed a
// working link and the download was recorded.
export function DownloadButton({ slug, fileId, label = 'Download', variant, size }: DownloadButtonProps) {
  const { state, download } = useDownloadResource(slug);

  async function handleClick() {
    try {
      await download(fileId);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start the download. Please try again.'));
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={state === 'preparing'}
      onClick={handleClick}
    >
      {state === 'preparing' ? null : state === 'done' ? (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {state === 'preparing' ? 'Preparing…' : state === 'done' ? 'Downloaded' : label}
    </Button>
  );
}
