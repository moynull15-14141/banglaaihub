'use client';

import { useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Flag, Heart, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { ReportResourceDialog } from '@/components/resource/ReportResourceDialog';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ROUTES } from '@/lib/constants/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDeletePost, useReportPost, useTogglePostLike, useUpdatePost } from '@/lib/hooks/usePosts';
import { formatRelativeDate } from '@/lib/utils/format';
import type { PostReportReason } from '@/lib/api/posts';
import type { Post } from '@/types/post';

const MAX_CONTENT_LENGTH = 1000;

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

export function UserPostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const isOwner = user?.id === post.author?.id;
  const authorName = post.author?.display_name ?? post.author?.username ?? 'Unknown';

  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content ?? '');
  const [displayContent, setDisplayContent] = useState(post.content ?? '');

  const toggleLikeMutation = useTogglePostLike();
  const deleteMutation = useDeletePost();
  const reportMutation = useReportPost();
  const updateMutation = useUpdatePost();

  function handleToggleLike() {
    if (!user) {
      toast.error('Sign in to like posts.');
      return;
    }
    // Optimistic — a like/unlike should feel instant, matching ResourceCard's
    // bookmark toggle. Rolled back on failure.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));
    toggleLikeMutation.mutate(post.id, {
      onError: (error) => {
        setLiked(!nextLiked);
        setLikeCount((count) => count + (nextLiked ? -1 : 1));
        toast.error(errorMessage(error, 'Could not update this like.'));
      },
    });
  }

  function handleReport(input: { reason: PostReportReason; description?: string }) {
    reportMutation.mutate(
      { id: post.id, input },
      {
        onSuccess: () => {
          toast.success('Report submitted. A moderator will review this.');
          setReportOpen(false);
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not submit this report.')),
      },
    );
  }

  function handleSaveEdit() {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    updateMutation.mutate(
      { id: post.id, content: trimmed },
      {
        onSuccess: () => {
          setDisplayContent(trimmed);
          setIsEditing(false);
          toast.success('Post updated.');
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not update this post.')),
      },
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        {post.author ? (
          <Link href={ROUTES.userProfile(post.author.username)} className="flex items-center gap-2">
            <UserAvatar avatarUrl={post.author.avatar_url} name={authorName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{authorName}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeDate(post.created_at)}</p>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Deleted user</p>
        )}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Post options">
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditContent(displayContent);
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setReportOpen(true)}>
                  <Flag className="size-4" aria-hidden="true" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value.slice(0, MAX_CONTENT_LENGTH))}
              rows={3}
              maxLength={MAX_CONTENT_LENGTH}
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {editContent.length}/{MAX_CONTENT_LENGTH}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={updateMutation.isPending}
                  disabled={!editContent.trim()}
                  onClick={handleSaveEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{displayContent}</p>
        )}
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded/pasted URL, no fixed domain to allowlist for next/image
          <img src={post.image_url} alt="" loading="lazy" className="max-h-96 w-full rounded-lg object-cover" />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={liked ? 'text-destructive' : undefined}
          onClick={handleToggleLike}
        >
          <Heart className={liked ? 'size-4 fill-current' : 'size-4'} aria-hidden="true" />
          {likeCount}
        </Button>
      </CardContent>

      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this post?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(post.id, {
            onSuccess: () => {
              toast.success('Post deleted.');
              setDeleteOpen(false);
            },
            onError: (error) => toast.error(errorMessage(error, 'Could not delete this post.')),
          });
        }}
      />

      <ReportResourceDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        resourceTitle={`${authorName}'s post`}
        isPending={reportMutation.isPending}
        onConfirm={handleReport}
      />
    </Card>
  );
}
