'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileDropzone } from '@/components/resource/FileDropzone';
import { useRemoveFeedAnnouncementImage, useUploadFeedAnnouncementImage } from '@/lib/hooks/useFeedAdmin';
import type { UploadProgressInfo } from '@/lib/api/resources';
import type { FeedAnnouncement } from '@/types/feed-admin';

const IMAGE_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface FeedAnnouncementFormDialogProps {
  announcement: FeedAnnouncement | null; // null = create mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (input: { title: string; body: string; link_url?: string; is_active: boolean }) => void;
}

export function FeedAnnouncementFormDialog({
  announcement,
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: FeedAnnouncementFormDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // The image uploads to its own endpoint (POST .../:id/image) rather than
  // riding along in the create/update body — it needs an announcement id to
  // exist first, same reasoning as resource thumbnails in EditResourceView.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageBytesPerSecond, setImageBytesPerSecond] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const uploadImageMutation = useUploadFeedAnnouncementImage();
  const removeImageMutation = useRemoveFeedAnnouncementImage();

  useEffect(() => {
    if (open) {
      setTitle(announcement?.title ?? '');
      setBody(announcement?.body ?? '');
      setLinkUrl(announcement?.link_url ?? '');
      setIsActive(announcement?.is_active ?? true);
      setImageFile(null);
      setImageError(null);
    }
  }, [open, announcement]);

  function handleImageSelect(file: File | null) {
    setImageFile(file);
    setImageError(null);

    if (!file) {
      if (announcement?.image_url) {
        removeImageMutation.mutate(announcement.id, {
          onSuccess: () => toast.success('Image removed.'),
          onError: (error) => toast.error(errorMessage(error, 'Could not remove the image.')),
        });
      }
      return;
    }

    if (!announcement) return; // create mode — nothing to attach the image to yet
    uploadImageMutation.mutate(
      {
        id: announcement.id,
        file,
        onProgress: (info: UploadProgressInfo) => {
          setImageProgress(info.percent);
          setImageBytesPerSecond(info.bytesPerSecond);
        },
      },
      {
        onSuccess: () => toast.success('Image updated.'),
        onError: (error) => setImageError(errorMessage(error, 'The image upload failed.')),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{announcement ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          <DialogDescription>Shows as a fixed card near the top of the Community/For You feeds.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-body">Body</Label>
            <Textarea id="announcement-body" value={body} onChange={(event) => setBody(event.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            {announcement ? (
              <>
                {announcement.image_url && !imageFile ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-only preview of an already-uploaded image
                  <img
                    src={announcement.image_url}
                    alt=""
                    className="h-24 w-full rounded-lg border border-border/60 object-cover"
                  />
                ) : null}
                <FileDropzone
                  label="Drag & drop an image, or click to browse"
                  hint="PNG, JPG, or WEBP — up to 5MB"
                  accept={IMAGE_FILE_ACCEPT}
                  file={imageFile}
                  onFileSelect={handleImageSelect}
                  uploading={uploadImageMutation.isPending}
                  progress={imageProgress}
                  bytesPerSecond={imageBytesPerSecond}
                  uploaded={uploadImageMutation.isSuccess}
                  error={imageError}
                />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Save the announcement first, then come back here to add an image.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-link">Link URL (optional)</Label>
            <Input
              id="announcement-link"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://…"
            />
            <p className="text-xs text-muted-foreground">
              Where &ldquo;Learn more&rdquo; sends the user — separate from the image above.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="announcement-active" className="font-normal">
              Active
            </Label>
            <Switch id="announcement-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {announcement ? 'Close' : 'Cancel'}
          </Button>
          <Button
            loading={isPending}
            disabled={!title.trim() || !body.trim()}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                body: body.trim(),
                link_url: linkUrl.trim() || undefined,
                is_active: isActive,
              })
            }
          >
            {announcement ? 'Save changes' : 'Create & continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
