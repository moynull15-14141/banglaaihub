'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Loader2, Link2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/resource/FileDropzone';

const THUMBNAIL_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp';

interface ThumbnailUrlInputProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  // Optional — Submit defers the actual upload until after the resource
  // exists, so it never passes these (FileDropzone just shows "selected,
  // not uploaded yet"). Edit uploads immediately on selection and passes
  // these through for live progress/error feedback.
  uploading?: boolean;
  progress?: number;
  bytesPerSecond?: number | null;
  uploaded?: boolean;
  uploadError?: string | null;
}

type PreviewState = 'idle' | 'loading' | 'loaded' | 'error';

function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Paste-a-URL stays the default (unchanged, backward compatible), but a
// contributor can now also upload an image directly — reuses the same
// StorageService pipeline as everything else (POST /resources/:slug/upload
// ?kind=thumbnail), triggered after the resource is created, exactly like
// the dataset-file flow.
export function ThumbnailUrlInput({
  id,
  label = 'Thumbnail',
  value,
  onChange,
  file,
  onFileChange,
  uploading = false,
  progress = 0,
  bytesPerSecond,
  uploaded = false,
  uploadError,
}: ThumbnailUrlInputProps) {
  const [mode, setMode] = useState<'url' | 'upload'>(file ? 'upload' : 'url');
  const [previewState, setPreviewState] = useState<PreviewState>('idle');

  useEffect(() => {
    if (!isValidUrl(value)) {
      setPreviewState('idle');
      return;
    }
    setPreviewState('loading');
  }, [value]);

  const showInvalidHint = mode === 'url' && value.length > 0 && !isValidUrl(value);

  function switchMode(next: 'url' | 'upload') {
    setMode(next);
    if (next === 'upload') onChange('');
    else onFileChange(null);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === 'url' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => switchMode('url')}
          >
            <Link2 className="size-3" aria-hidden="true" />
            URL
          </Button>
          <Button
            type="button"
            variant={mode === 'upload' ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => switchMode('upload')}
          >
            <Upload className="size-3" aria-hidden="true" />
            Upload
          </Button>
        </div>
      </div>

      {mode === 'upload' ? (
        <FileDropzone
          label="Drag & drop an image, or click to browse"
          hint="PNG, JPG, or WEBP — up to 5MB"
          accept={THUMBNAIL_FILE_ACCEPT}
          file={file}
          onFileSelect={onFileChange}
          uploading={uploading}
          progress={progress}
          bytesPerSecond={bytesPerSecond}
          uploaded={uploaded}
          error={uploadError}
        />
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1">
            <Input
              id={id}
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://…"
              aria-invalid={showInvalidHint || undefined}
            />
            {showInvalidHint ? <p className="text-xs text-destructive">Enter a valid image URL.</p> : null}
          </div>
          <div
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted"
            aria-live="polite"
          >
            {previewState === 'idle' ? <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" /> : null}
            {previewState === 'loading' ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : null}
            {previewState === 'error' ? (
              <span title="Couldn't load this image">
                <ImageOff className="size-5 text-destructive" aria-hidden="true" />
              </span>
            ) : null}
            {isValidUrl(value) ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied external URL, preview-only
              <img
                src={value}
                alt=""
                className={previewState === 'loaded' ? 'size-full object-cover' : 'hidden'}
                onLoad={() => setPreviewState('loaded')}
                onError={() => setPreviewState('error')}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
