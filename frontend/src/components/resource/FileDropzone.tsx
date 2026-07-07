'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function fileExtensionLabel(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return 'file';
  return name.slice(dotIndex + 1).toUpperCase();
}

interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  uploading?: boolean;
  progress?: number;
  bytesPerSecond?: number | null;
  uploaded?: boolean;
  error?: string | null;
  disabled?: boolean;
  onCancel?: () => void;
}

// Generic drag-and-drop + file-picker uploader — used by the resource
// submission wizard for dataset files. Deliberately UI-only: it never talks
// to StorageService/R2 itself, the caller owns the actual upload mutation
// (useUploadResourceFile) and just passes progress/uploading/error back in.
export function FileDropzone({
  label,
  hint,
  accept,
  file,
  onFileSelect,
  uploading = false,
  progress = 0,
  bytesPerSecond,
  uploaded = false,
  error,
  disabled = false,
  onCancel,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const nextFile = files?.[0];
    if (nextFile) onFileSelect(nextFile);
  }

  if (file) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {uploaded ? (
              <CheckCircle2
                className="size-4 shrink-0 animate-in text-emerald-600 zoom-in-50 duration-300"
                aria-hidden="true"
              />
            ) : (
              <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {fileExtensionLabel(file.name)} &middot; {formatBytes(file.size)}
                {uploading && bytesPerSecond ? ` · ${formatSpeed(bytesPerSecond)}` : ''}
              </p>
            </div>
          </div>
          {!disabled && (
            <div className="flex shrink-0 items-center gap-1.5">
              {uploading && onCancel ? (
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onFileSelect(null)}
                    aria-label="Remove file"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        {uploading ? (
          <div className="space-y-1" role="status" aria-live="polite">
            <Progress value={progress} aria-label="Upload progress" />
            <p className="text-xs text-muted-foreground">Uploading&hellip; {progress}%</p>
          </div>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-ring/50 hover:bg-muted/40',
          isDragOver && 'border-brand bg-brand/5',
        )}
      >
        <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
