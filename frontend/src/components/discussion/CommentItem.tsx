'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Flag, ThumbsUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user/UserAvatar';
import { CommentForm } from '@/components/discussion/CommentForm';
import { MarkdownContent } from '@/components/discussion/MarkdownContent';
import { formatDate } from '@/lib/utils/format';
import type { Comment } from '@/types/comment';

interface CommentItemProps {
  comment: Comment;
  depth: number;
  currentUserId: string | null;
  canModerate: boolean;
  isReplying: boolean;
  isEditing: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onStartReply: () => void;
  onStartEdit: () => void;
  onCancelReplyOrEdit: () => void;
  onSubmitReply: (content: string) => void;
  onSubmitEdit: (content: string) => void;
  onDelete: () => void;
  onToggleLike: () => void;
  onReport: () => void;
  isMutationPending: boolean;
  children?: React.ReactNode;
}

export function CommentItem({
  comment,
  depth,
  currentUserId,
  canModerate,
  isReplying,
  isEditing,
  isCollapsed,
  onToggleCollapse,
  onStartReply,
  onStartEdit,
  onCancelReplyOrEdit,
  onSubmitReply,
  onSubmitEdit,
  onDelete,
  onToggleLike,
  onReport,
  isMutationPending,
  children,
}: CommentItemProps) {
  const [quote] = useState(() => {
    if (comment.is_deleted || !comment.content) return '';
    return `> ${comment.content.replace(/\n/g, '\n> ')}\n\n`;
  });

  const isOwn = Boolean(currentUserId && comment.author?.id === currentUserId);
  const authorName = comment.author?.display_name ?? comment.author?.username ?? 'Unknown';
  const hasReplies = comment.replies.length > 0;

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-border pl-4' : ''}>
      <div className="space-y-1.5 py-3">
        <div className="flex items-center gap-2">
          {comment.is_deleted ? (
            <span className="text-sm text-muted-foreground italic">[deleted]</span>
          ) : (
            <>
              <UserAvatar avatarUrl={comment.author?.avatar_url} name={authorName} size="sm" />
              <span className="text-sm font-medium">{authorName}</span>
            </>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
        </div>

        {!comment.is_deleted ? (
          isEditing ? (
            <CommentForm
              initialValue={comment.content ?? ''}
              isPending={isMutationPending}
              submitLabel="Save changes"
              onSubmit={onSubmitEdit}
              onCancel={onCancelReplyOrEdit}
              autoFocus
            />
          ) : (
            <MarkdownContent content={comment.content ?? ''} />
          )
        ) : null}

        {!comment.is_deleted ? (
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={onToggleLike}>
              <ThumbsUp
                className="size-3.5"
                aria-hidden="true"
                fill={comment.is_liked ? 'currentColor' : 'none'}
              />
              {comment.like_count}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onStartReply}>
              Reply
            </Button>
            {isOwn ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onStartEdit}>
                  Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isMutationPending}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={onReport}>
                  <Flag className="size-3.5" aria-hidden="true" />
                  Report
                </Button>
                {canModerate ? (
                  <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isMutationPending}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </>
            )}
            {hasReplies ? (
              <Button type="button" variant="ghost" size="sm" onClick={onToggleCollapse}>
                {isCollapsed ? (
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                ) : (
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                )}
                {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
              </Button>
            ) : null}
          </div>
        ) : hasReplies ? (
          <Button type="button" variant="ghost" size="sm" onClick={onToggleCollapse}>
            {isCollapsed ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            )}
            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
          </Button>
        ) : null}

        {isReplying ? (
          <div className="pt-2">
            <CommentForm
              initialValue={quote}
              isPending={isMutationPending}
              submitLabel="Post reply"
              onSubmit={onSubmitReply}
              onCancel={onCancelReplyOrEdit}
              autoFocus
            />
          </div>
        ) : null}
      </div>

      {!isCollapsed ? children : null}
    </div>
  );
}
