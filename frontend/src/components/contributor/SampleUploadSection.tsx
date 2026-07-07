'use client';

import { useRef } from 'react';
import { isAxiosError } from 'axios';
import { FileUp, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUploadContributorSample } from '@/lib/hooks/useContributorApplication';
import { useQueryClient } from '@tanstack/react-query';

interface SampleUploadSectionProps {
  sampleFileUrls: string[];
  supportingDocumentUrls: string[];
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function UploadRow({
  label,
  count,
  kind,
}: {
  label: string;
  count: number;
  kind: 'sample' | 'supporting';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadContributorSample();
  const queryClient = useQueryClient();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    uploadMutation.mutate(
      { file, kind },
      {
        onSuccess: () => {
          toast.success('File uploaded.');
          void queryClient.invalidateQueries({ queryKey: ['contributor-applications', 'me'] });
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not upload this file.')),
      },
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>{label}</span>
        <span className="text-muted-foreground">
          ({count} file{count === 1 ? '' : 's'})
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".csv,.json,.txt,.zip,.tar,.gz,.pdf"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="size-4" aria-hidden="true" />
        Upload
      </Button>
    </div>
  );
}

// Only usable once an active (pending/needs_revision) application exists —
// the backend attaches uploads to that row, so this section only renders
// alongside the form/status views for those two statuses.
export function SampleUploadSection({
  sampleFileUrls,
  supportingDocumentUrls,
}: SampleUploadSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Samples & supporting documents</CardTitle>
        <CardDescription>
          Upload sample datasets, tools, or papers, plus an optional resume or other supporting
          documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <UploadRow label="Sample files" count={sampleFileUrls.length} kind="sample" />
        <UploadRow
          label="Resume & supporting documents (optional)"
          count={supportingDocumentUrls.length}
          kind="supporting"
        />
      </CardContent>
    </Card>
  );
}
