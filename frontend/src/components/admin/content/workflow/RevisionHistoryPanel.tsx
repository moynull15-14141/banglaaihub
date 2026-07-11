'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { GitCompare, History, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { formatDate } from '@/lib/utils/format';
import { useArticleRevisions, useCompareRevisions, useRestoreRevision } from '@/lib/hooks/useArticleRevisions';
import { CompareVersionsView } from '@/components/admin/content/workflow/CompareVersionsView';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface RevisionHistoryPanelProps {
  slug: string;
}

// Revisions are append-only (never deleted or overwritten) — restoring an
// old version creates a NEW revision recording the restore, per the brief's
// "Never permanently delete revisions." Loaded lazily (only when the panel
// is expanded), per the performance requirement on revision loading.
export function RevisionHistoryPanel({ slug }: RevisionHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; version: number } | null>(null);

  const { data: revisions, isLoading } = useArticleRevisions(slug, open);
  const { data: diff, isLoading: isComparing } = useCompareRevisions(compareA, compareB);
  const restoreMutation = useRestoreRevision(slug);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revision History</CardTitle>
            <CardDescription>Every save creates a version. Nothing is ever deleted.</CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
            <History className="size-4" aria-hidden="true" />
            {open ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="flex flex-col gap-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !revisions || revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No revisions yet.</p>
          ) : (
            revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    v{revision.version_number}
                    {revision.summary ? ` — ${revision.summary}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {revision.editor?.display_name ?? revision.editor?.username ?? 'Unknown'} ·{' '}
                    {formatDate(revision.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      const previous = revisions.find((r) => r.version_number === revision.version_number - 1);
                      setCompareA((previous ?? revision).id);
                      setCompareB(revision.id);
                    }}
                  >
                    <GitCompare className="size-3.5" aria-hidden="true" />
                    Compare
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setRestoreTarget({ id: revision.id, version: revision.version_number })}
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      ) : null}

      <Dialog
        open={Boolean(compareA && compareB)}
        onOpenChange={(next) => {
          if (!next) {
            setCompareA(null);
            setCompareB(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compare versions</DialogTitle>
          </DialogHeader>
          {isComparing ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : diff ? (
            <CompareVersionsView title={diff.title} body={diff.body} />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={restoreTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRestoreTarget(null);
        }}
        title={`Restore version ${restoreTarget?.version ?? ''}?`}
        description="This creates a new revision with the old content — nothing is deleted."
        confirmLabel="Restore"
        isPending={restoreMutation.isPending}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget.id, {
            onSuccess: () => {
              toast.success('Version restored.');
              setRestoreTarget(null);
            },
            onError: (error) => toast.error(errorMessage(error, 'Could not restore this version.')),
          });
        }}
      />
    </Card>
  );
}
