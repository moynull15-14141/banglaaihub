'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CommentForm } from '@/components/discussion/CommentForm';
import { CommentThread, type CommentThreadActions } from '@/components/discussion/CommentThread';
import { ReportResourceDialog } from '@/components/resource/ReportResourceDialog';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Pagination } from '@/components/common/Pagination';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useReportComment,
  useToggleCommentLike,
  useUpdateComment,
} from '@/lib/hooks/useComments';
import { ROUTES } from '@/lib/constants/routes';
import type { ReportReason } from '@/lib/api/comments';
import type { CommentSort } from '@/types/comment';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

const MODERATOR_ROLES = ['moderator', 'admin', 'super_admin'];

interface DiscussionSectionProps {
  resourceSlug: string;
}

export function DiscussionSection({ resourceSlug }: DiscussionSectionProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { page, limit, setPage } = usePagination({ initialLimit: 10 });
  const [sort, setSort] = useState<CommentSort>('newest');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const { data, isLoading } = useComments(resourceSlug, { sort, page, limit });
  const createMutation = useCreateComment(resourceSlug);
  const updateMutation = useUpdateComment(resourceSlug);
  const deleteMutation = useDeleteComment(resourceSlug);
  const likeMutation = useToggleCommentLike(resourceSlug);
  const reportMutation = useReportComment();

  const canModerate = Boolean(user && user.roles.some((role) => MODERATOR_ROLES.includes(role)));
  const comments = data?.data ?? [];
  const isMutationPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  function requireAuth(): boolean {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return false;
    }
    return true;
  }

  const actions: CommentThreadActions = {
    currentUserId: user?.id ?? null,
    canModerate,
    replyingToId,
    editingId,
    collapsedIds,
    onToggleCollapse: (id) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    onStartReply: (id) => {
      if (!requireAuth()) return;
      setEditingId(null);
      setReplyingToId(id);
    },
    onStartEdit: (id) => {
      setReplyingToId(null);
      setEditingId(id);
    },
    onCancel: () => {
      setReplyingToId(null);
      setEditingId(null);
    },
    onSubmitReply: (parentId, content) => {
      createMutation.mutate(
        { content, parent_id: parentId },
        {
          onSuccess: () => {
            toast.success('Reply posted.');
            setReplyingToId(null);
          },
          onError: (error) => toast.error(errorMessage(error, 'Could not post your reply.')),
        },
      );
    },
    onSubmitEdit: (commentId, content) => {
      updateMutation.mutate(
        { commentId, input: { content } },
        {
          onSuccess: () => {
            toast.success('Comment updated.');
            setEditingId(null);
          },
          onError: (error) => toast.error(errorMessage(error, 'Could not update your comment.')),
        },
      );
    },
    onDelete: (commentId) => {
      deleteMutation.mutate(commentId, {
        onSuccess: () => toast.success('Comment removed.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not remove this comment.')),
      });
    },
    onToggleLike: (commentId) => {
      if (!requireAuth()) return;
      likeMutation.mutate(commentId, {
        onError: (error) => toast.error(errorMessage(error, 'Could not update your like.')),
      });
    },
    onReport: (commentId) => {
      if (!requireAuth()) return;
      setReportTargetId(commentId);
    },
    isMutationPending,
  };

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <SectionHeader title="Discussion" />

      {isAuthenticated ? (
        <CommentForm
          isPending={createMutation.isPending}
          onSubmit={(content) =>
            createMutation.mutate(
              { content },
              {
                onSuccess: () => toast.success('Comment posted.'),
                onError: (error) => toast.error(errorMessage(error, 'Could not post your comment.')),
              },
            )
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          <button type="button" className="underline" onClick={() => router.push(ROUTES.login)}>
            Log in
          </button>{' '}
          to join the discussion.
        </p>
      )}

      {comments.length > 1 ? (
        <div className="flex justify-end">
          <FilterSelect value={sort} onChange={(event) => setSort(event.target.value as CommentSort)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most liked</option>
          </FilterSelect>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — start the discussion.</p>
      ) : (
        <div className="divide-y divide-border">
          <CommentThread comments={comments} depth={0} actions={actions} />
        </div>
      )}

      {data ? (
        <Pagination page={page} limit={limit} total={data.meta.total ?? 0} onPageChange={setPage} />
      ) : null}

      <ReportResourceDialog
        open={reportTargetId !== null}
        onOpenChange={(open) => setReportTargetId(open ? reportTargetId : null)}
        resourceTitle="this comment"
        isPending={reportMutation.isPending}
        onConfirm={(input: { reason: ReportReason; description?: string }) => {
          if (!reportTargetId) return;
          reportMutation.mutate(
            { commentId: reportTargetId, input },
            {
              onSuccess: () => {
                toast.success('Report submitted — a moderator will review it.');
                setReportTargetId(null);
              },
              onError: (error) => toast.error(errorMessage(error, 'Could not submit your report.')),
            },
          );
        }}
      />
    </section>
  );
}
