'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, MessageSquare, Reply, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/user/UserAvatar';
import { formatDate } from '@/lib/utils/format';
import {
  useCreateEditorialComment,
  useEditorialComments,
  useResolveEditorialComment,
} from '@/lib/hooks/useArticleComments';
import type { EditorialComment, EditorialCommentKind } from '@/lib/api/articleWorkflow';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface CommentNodeViewProps {
  comment: EditorialComment;
  slug: string;
  depth?: number;
}

function CommentNodeView({ comment, slug, depth = 0 }: CommentNodeViewProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const createMutation = useCreateEditorialComment(slug);
  const resolveMutation = useResolveEditorialComment(slug);

  return (
    <div className={depth > 0 ? 'ml-8 border-l border-border/60 pl-3' : ''}>
      <div className="flex items-start gap-2.5 py-2">
        <UserAvatar
          avatarUrl={null}
          name={comment.author?.display_name ?? comment.author?.username ?? 'Unknown'}
          className="size-7"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{comment.author?.display_name ?? comment.author?.username}</span>
            <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
            {comment.resolved ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Resolved
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.content}</p>
          <div className="mt-1 flex items-center gap-2">
            {comment.kind === 'comment' ? (
              <Button type="button" variant="ghost" size="xs" onClick={() => setReplying((prev) => !prev)}>
                <Reply className="size-3" aria-hidden="true" />
                Reply
              </Button>
            ) : null}
            {comment.kind === 'comment' ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                loading={resolveMutation.isPending}
                onClick={() =>
                  resolveMutation.mutate(
                    { commentId: comment.id, resolved: !comment.resolved },
                    { onError: (error) => toast.error(errorMessage(error, 'Could not update this comment.')) },
                  )
                }
              >
                {comment.resolved ? 'Unresolve' : 'Resolve'}
              </Button>
            ) : null}
          </div>
          {replying ? (
            <div className="mt-2 flex flex-col gap-2">
              <Textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={2}
                placeholder="Reply… use @username to mention someone"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="xs" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="xs"
                  loading={createMutation.isPending}
                  onClick={() =>
                    createMutation.mutate(
                      { content: replyText, kind: 'comment', parent_id: comment.id },
                      {
                        onSuccess: () => {
                          setReplyText('');
                          setReplying(false);
                        },
                        onError: (error) => toast.error(errorMessage(error, 'Could not post this reply.')),
                      },
                    )
                  }
                >
                  Reply
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {comment.replies.map((reply) => (
        <CommentNodeView key={reply.id} comment={reply} slug={slug} depth={depth + 1} />
      ))}
    </div>
  );
}

interface EditorialCommentsPanelProps {
  slug: string;
}

// Private, editorial-staff-only — a separate model from the public resource
// discussion comments (see backend's ArticleEditorialComment), never
// reachable from any public route. The `notes` mode reuses the same model
// with `kind: 'note'` instead of a second schema/UI, since both are
// private-to-editorial-team and differ only in threading/resolve display.
export function EditorialCommentsPanel({ slug }: EditorialCommentsPanelProps) {
  const [mode, setMode] = useState<EditorialCommentKind>('comment');
  const [newText, setNewText] = useState('');
  const { data: comments, isLoading } = useEditorialComments(slug, mode);
  const createMutation = useCreateEditorialComment(slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editorial {mode === 'note' ? 'Notes' : 'Comments'}</CardTitle>
        <CardDescription>
          {mode === 'note'
            ? 'Private notes visible only to editorial staff.'
            : 'Threaded discussion, visible only to editorial staff. Use @username to mention someone.'}
        </CardDescription>
        <Tabs value={mode} onValueChange={(value) => setMode(value as EditorialCommentKind)}>
          <TabsList>
            <TabsTrigger value="comment">
              <MessageSquare className="size-3.5" aria-hidden="true" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="note">
              <StickyNote className="size-3.5" aria-hidden="true" />
              Notes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Textarea
            value={newText}
            onChange={(event) => setNewText(event.target.value)}
            rows={2}
            placeholder={mode === 'note' ? 'Add a private note…' : 'Add a comment… use @username to mention someone'}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              loading={createMutation.isPending}
              disabled={!newText.trim()}
              onClick={() =>
                createMutation.mutate(
                  { content: newText, kind: mode },
                  {
                    onSuccess: () => setNewText(''),
                    onError: (error) => toast.error(errorMessage(error, 'Could not post this.')),
                  },
                )
              }
            >
              {mode === 'note' ? 'Add note' : 'Comment'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {comments.map((comment) => (
              <CommentNodeView key={comment.id} comment={comment} slug={slug} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
