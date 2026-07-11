'use client';

import { CommentItem } from '@/components/discussion/CommentItem';
import type { Comment } from '@/types/comment';

export interface CommentThreadActions {
  currentUserId: string | null;
  canModerate: boolean;
  replyingToId: string | null;
  editingId: string | null;
  collapsedIds: Set<string>;
  onToggleCollapse: (commentId: string) => void;
  onStartReply: (commentId: string) => void;
  onStartEdit: (commentId: string) => void;
  onCancel: () => void;
  onSubmitReply: (parentId: string, content: string) => void;
  onSubmitEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  onReport: (commentId: string) => void;
  isMutationPending: boolean;
}

interface CommentThreadProps {
  comments: Comment[];
  depth: number;
  actions: CommentThreadActions;
}

export function CommentThread({ comments, depth, actions }: CommentThreadProps) {
  return (
    <>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          depth={depth}
          currentUserId={actions.currentUserId}
          canModerate={actions.canModerate}
          isReplying={actions.replyingToId === comment.id}
          isEditing={actions.editingId === comment.id}
          isCollapsed={actions.collapsedIds.has(comment.id)}
          onToggleCollapse={() => actions.onToggleCollapse(comment.id)}
          onStartReply={() => actions.onStartReply(comment.id)}
          onStartEdit={() => actions.onStartEdit(comment.id)}
          onCancelReplyOrEdit={actions.onCancel}
          onSubmitReply={(content) => actions.onSubmitReply(comment.id, content)}
          onSubmitEdit={(content) => actions.onSubmitEdit(comment.id, content)}
          onDelete={() => actions.onDelete(comment.id)}
          onToggleLike={() => actions.onToggleLike(comment.id)}
          onReport={() => actions.onReport(comment.id)}
          isMutationPending={actions.isMutationPending}
        >
          {comment.replies.length > 0 ? (
            <CommentThread comments={comment.replies} depth={depth + 1} actions={actions} />
          ) : null}
        </CommentItem>
      ))}
    </>
  );
}
