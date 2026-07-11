'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Pagination } from '@/components/common/Pagination';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReportsFilters } from '@/components/admin/reports/ReportsFilters';
import { DismissReportDialog } from '@/components/admin/reports/DismissReportDialog';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { useAdminReports, useRejectReport, useResolveReport } from '@/lib/hooks/useAdmin';
import { deleteComment } from '@/lib/api/comments';
import { deleteReview } from '@/lib/api/reviews';
import { formatDate } from '@/lib/utils/format';
import type { Report, ReportReason, ReportStatus, ReportTargetType } from '@/types/report';

const PAGE_SIZE = 20;

function targetPreview(report: Report): { text: string; href: string | null } {
  if (report.target_type === 'comment' && report.comment) {
    return {
      text: report.comment.content ?? '[already removed]',
      href: `/resources/${report.comment.resource.slug}`,
    };
  }
  if (report.target_type === 'review' && report.review) {
    return {
      text: report.review.title ?? `${report.review.rating}★ review`,
      href: `/resources/${report.review.resource.slug}`,
    };
  }
  if (report.resource) {
    return { text: report.resource.title, href: `/resources/${report.resource.slug}` };
  }
  return { text: '[content removed]', href: null };
}

export function ReportsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') as ReportStatus | null) ?? 'pending';
  const targetType = (searchParams.get('target_type') as ReportTargetType | null) ?? undefined;
  const reason = (searchParams.get('reason') as ReportReason | null) ?? undefined;
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!('page' in updates)) params.delete('page');
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo(
    () => ({ status, target_type: targetType, reason, page, limit: PAGE_SIZE }),
    [status, targetType, reason, page],
  );

  const { data, isLoading, isError, refetch } = useAdminReports(queryParams);
  const resolveMutation = useResolveReport();
  const rejectMutation = useRejectReport();

  const [dismissTarget, setDismissTarget] = useState<Report | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Report | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemoveContent(report: Report) {
    setIsRemoving(true);
    try {
      if (report.target_type === 'comment' && report.comment) {
        await deleteComment(report.comment.id);
      } else if (report.target_type === 'review' && report.review) {
        await deleteReview(report.review.id);
      }
      await resolveMutation.mutateAsync(report.id);
      toast.success('Content removed and report resolved.');
      setRemoveTarget(null);
    } catch {
      toast.error('Could not remove this content. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }

  const reports = data?.data ?? [];

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
      <p className="mt-1 text-muted-foreground">
        Review reports filed against resources, reviews, and comments.
      </p>

      <div className="mt-6 space-y-4">
        <ReportsFilters
          status={status}
          onStatusChange={(value) => updateParams({ status: value })}
          targetType={targetType}
          onTargetTypeChange={(value) => updateParams({ target_type: value })}
          reason={reason}
          onReasonChange={(value) => updateParams({ reason: value })}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : isError ? (
          <EmptyState
            title="Couldn't load reports"
            description="Something went wrong while fetching data from the server."
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        ) : reports.length === 0 ? (
          <EmptyState title="No reports here" description="Nothing matches these filters right now." />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const preview = targetPreview(report);
              return (
                <div key={report.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{report.target_type}</Badge>
                    <Badge variant="secondary">{report.reason.replace('_', ' ')}</Badge>
                    <Badge
                      variant={
                        report.status === 'resolved'
                          ? 'success'
                          : report.status === 'dismissed'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {report.status}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </span>
                  </div>

                  {preview.href ? (
                    <Link href={preview.href} className="block text-sm hover:underline" target="_blank">
                      {preview.text}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{preview.text}</p>
                  )}

                  {report.description ? (
                    <p className="text-sm text-muted-foreground">&ldquo;{report.description}&rdquo;</p>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    Reported by {report.reporter?.display_name ?? report.reporter?.username ?? 'Unknown'}
                  </p>

                  {report.status === 'pending' || report.status === 'reviewed' ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        loading={resolveMutation.isPending}
                        onClick={() =>
                          resolveMutation.mutate(report.id, {
                            onSuccess: () => toast.success('Report marked resolved.'),
                            onError: () => toast.error('Could not resolve this report.'),
                          })
                        }
                      >
                        Resolve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDismissTarget(report)}>
                        Dismiss
                      </Button>
                      {report.target_type !== 'resource' ? (
                        <Button size="sm" variant="destructive" onClick={() => setRemoveTarget(report)}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Remove content
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {data ? (
          <Pagination
            page={page}
            limit={data.meta.limit ?? PAGE_SIZE}
            total={data.meta.total ?? 0}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
          />
        ) : null}
      </div>

      <DismissReportDialog
        open={dismissTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDismissTarget(null);
        }}
        isPending={rejectMutation.isPending}
        onConfirm={(reasonText) => {
          if (!dismissTarget) return;
          rejectMutation.mutate(
            { id: dismissTarget.id, reason: reasonText },
            {
              onSuccess: () => {
                toast.success('Report dismissed.');
                setDismissTarget(null);
              },
              onError: () => toast.error('Could not dismiss this report.'),
            },
          );
        }}
      />

      <ConfirmActionDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove reported content?"
        description="This will hide the review/comment (soft delete) and mark the report resolved. The author will be notified."
        confirmLabel="Remove"
        variant="destructive"
        isPending={isRemoving}
        onConfirm={() => {
          if (removeTarget) void handleRemoveContent(removeTarget);
        }}
      />
    </PageContainer>
  );
}
