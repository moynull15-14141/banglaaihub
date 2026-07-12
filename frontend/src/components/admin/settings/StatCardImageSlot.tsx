'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetStatCardImage, useUploadStatCardImage } from '@/lib/hooks/useStatCardImages';
import type { StatCardImage } from '@/lib/api/statCardImages';
import type { ResourceType } from '@/types/resource';

interface StatCardImageSlotProps {
  type: ResourceType;
  label: string;
  icon: LucideIcon;
  current: StatCardImage | undefined;
}

export function StatCardImageSlot({ type, label, icon: Icon, current }: StatCardImageSlotProps) {
  const uploadMutation = useUploadStatCardImage();
  const resetMutation = useResetStatCardImage();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Local preview of the not-yet-uploaded file, so the admin sees exactly
  // what they picked before committing to Save.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const displayUrl = previewUrl ?? current?.url ?? null;

  async function handleSave() {
    if (!file) {
      toast.error('Choose an image first.');
      return;
    }
    try {
      await uploadMutation.mutateAsync({ slot: type, file });
      setFile(null);
      toast.success(`${label} hero image updated.`);
    } catch {
      toast.error('Could not save this image. Please try again.');
    }
  }

  async function handleReset() {
    try {
      await resetMutation.mutateAsync(type);
      setFile(null);
      toast.success(`${label} hero image reset to default.`);
    } catch {
      toast.error('Could not reset this image.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL / local blob preview, no fixed domain to allowlist for next/image
            <img src={displayUrl} alt="" className="size-full object-cover" />
          ) : (
            <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`stat-card-${type}`}>Hero image</Label>
          <Input
            id={`stat-card-${type}`}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending || !current}>
            Reset to default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
