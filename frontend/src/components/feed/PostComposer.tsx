'use client';

import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCreatePost } from '@/lib/hooks/usePosts';

const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp';
const MAX_CONTENT_LENGTH = 1000;

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

// The "anyone can post" entry point for the feed — a compact compose box,
// not the full discussion CommentForm (no markdown preview; a status update
// is short plain text + an optional image).
export function PostComposer() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreatePost();

  if (!user) return null;

  const authorName = user.display_name ?? user.username;

  function handleFileSelect(file: File | null) {
    setImageFile(file);
    setImagePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    createMutation.mutate(
      { content: trimmed, file: imageFile },
      {
        onSuccess: () => {
          toast.success('Posted!');
          setContent('');
          handleFileSelect(null);
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not publish this post.')),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex gap-3">
          <UserAvatar avatarUrl={user.avatar_url} name={authorName} size="sm" />
          <div className="flex-1 space-y-2">
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
              placeholder="Share something with the community…"
              rows={2}
              maxLength={MAX_CONTENT_LENGTH}
            />
            {imagePreviewUrl ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview of a not-yet-uploaded file */}
                <img src={imagePreviewUrl} alt="" className="max-h-48 rounded-lg border border-border/60" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="absolute top-1.5 right-1.5"
                  aria-label="Remove image"
                  onClick={() => handleFileSelect(null)}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={createMutation.isPending}
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  handleFileSelect(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {content.length}/{MAX_CONTENT_LENGTH}
                </span>
                <Button
                  type="button"
                  size="sm"
                  loading={createMutation.isPending}
                  disabled={!content.trim()}
                  onClick={handleSubmit}
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
