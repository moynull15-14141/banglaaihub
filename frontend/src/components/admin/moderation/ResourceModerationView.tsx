'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageContainer } from '@/components/common/PageContainer';
import { Pagination } from '@/components/common/Pagination';
import {
  ModerationFilters,
  type ModerationTab,
} from '@/components/admin/moderation/ModerationFilters';
import { ModerationTable } from '@/components/admin/moderation/ModerationTable';
import { ResourceDetailDrawer } from '@/components/admin/moderation/ResourceDetailDrawer';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { RejectResourceDialog } from '@/components/admin/moderation/RejectResourceDialog';
import {
  useAdminPendingResources,
  useApproveResource,
  useFeatureResource,
  useRejectResource,
  useRestoreResource,
  useUnfeatureResource,
} from '@/lib/hooks/useAdmin';
import type { ListResourcesParams, Resource } from '@/types/resource';

const PAGE_SIZE = 20;

function paramsForTab(tab: ModerationTab): Pick<ListResourcesParams, 'status' | 'featured' | 'deleted'> {
  switch (tab) {
    case 'approved':
      return { status: 'approved' };
    case 'rejected':
      return { status: 'rejected' };
    case 'featured':
      return { status: 'approved', featured: true };
    case 'deleted':
      return { deleted: true };
    default:
      return { status: 'pending' };
  }
}

export function ResourceModerationView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get('tab') as ModerationTab | null) ?? 'pending';
  const type = searchParams.get('type') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  // Free-text search has no server-side equivalent on this endpoint (see
  // Known limitations in the Phase 10b report) — it filters only the
  // currently-fetched page's results, not the whole moderation queue.
  const [search, setSearch] = useState('');

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo<ListResourcesParams>(
    () => ({
      ...paramsForTab(tab),
      type: type as ListResourcesParams['type'],
      category,
      sort: sort as ListResourcesParams['sort'],
      page,
      limit: PAGE_SIZE,
    }),
    [tab, type, category, sort, page],
  );

  const { data, isLoading, isError, refetch } = useAdminPendingResources(queryParams);

  const filteredResources = useMemo(() => {
    const rows = data?.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (resource) =>
        resource.title.toLowerCase().includes(query) ||
        (resource.description?.toLowerCase().includes(query) ?? false),
    );
  }, [data, search]);

  const [viewResource, setViewResource] = useState<Resource | null>(null);
  const [approveTarget, setApproveTarget] = useState<Resource | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Resource | null>(null);
  const [featureTarget, setFeatureTarget] = useState<Resource | null>(null);
  const [unfeatureTarget, setUnfeatureTarget] = useState<Resource | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Resource | null>(null);

  const approveMutation = useApproveResource();
  const rejectMutation = useRejectResource();
  const featureMutation = useFeatureResource();
  const unfeatureMutation = useUnfeatureResource();
  const restoreMutation = useRestoreResource();

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Pending Review
      </h1>
      <p className="mt-1 text-muted-foreground">
        Approve, reject, and feature resource submissions.
      </p>

      <div className="mt-6 space-y-4">
        <ModerationFilters
          tab={tab}
          onTabChange={(nextTab) => updateParams({ tab: nextTab })}
          type={type}
          onTypeChange={(value) => updateParams({ type: value })}
          category={category}
          onCategoryChange={(value) => updateParams({ category: value })}
          sort={sort}
          onSortChange={(value) => updateParams({ sort: value })}
          search={search}
          onSearchChange={setSearch}
        />

        <ModerationTable
          resources={filteredResources}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onView={setViewResource}
          onApprove={setApproveTarget}
          onReject={setRejectTarget}
          onFeature={setFeatureTarget}
          onUnfeature={setUnfeatureTarget}
          onRestore={setRestoreTarget}
        />

        {data ? (
          <Pagination
            page={page}
            limit={data.meta.limit ?? PAGE_SIZE}
            total={data.meta.total ?? 0}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
          />
        ) : null}
      </div>

      <ResourceDetailDrawer
        resource={viewResource}
        open={viewResource !== null}
        onOpenChange={(open) => {
          if (!open) setViewResource(null);
        }}
      />

      <ConfirmActionDialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null);
        }}
        title={`Approve "${approveTarget?.title ?? ''}"?`}
        description="This resource will become publicly visible immediately."
        confirmLabel="Approve"
        isPending={approveMutation.isPending}
        onConfirm={() => {
          if (!approveTarget) return;
          approveMutation.mutate(approveTarget.id, {
            onSuccess: () => {
              toast.success('Resource approved.');
              setApproveTarget(null);
            },
            onError: () => toast.error('Could not approve this resource. Please try again.'),
          });
        }}
      />

      <RejectResourceDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        resourceTitle={rejectTarget?.title ?? ''}
        isPending={rejectMutation.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          rejectMutation.mutate(
            { id: rejectTarget.id, reason },
            {
              onSuccess: () => {
                toast.success('Resource rejected.');
                setRejectTarget(null);
              },
              onError: () => toast.error('Could not reject this resource. Please try again.'),
            },
          );
        }}
      />

      <ConfirmActionDialog
        open={featureTarget !== null}
        onOpenChange={(open) => {
          if (!open) setFeatureTarget(null);
        }}
        title={`Feature "${featureTarget?.title ?? ''}"?`}
        description="Featured resources are highlighted on the home page."
        confirmLabel="Feature"
        isPending={featureMutation.isPending}
        onConfirm={() => {
          if (!featureTarget) return;
          featureMutation.mutate(featureTarget.id, {
            onSuccess: () => {
              toast.success('Resource featured.');
              setFeatureTarget(null);
            },
            onError: () => toast.error('Could not feature this resource. Please try again.'),
          });
        }}
      />

      <ConfirmActionDialog
        open={unfeatureTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnfeatureTarget(null);
        }}
        title={`Remove "${unfeatureTarget?.title ?? ''}" from featured?`}
        description="This resource will no longer be highlighted on the home page."
        confirmLabel="Unfeature"
        variant="destructive"
        isPending={unfeatureMutation.isPending}
        onConfirm={() => {
          if (!unfeatureTarget) return;
          unfeatureMutation.mutate(unfeatureTarget.id, {
            onSuccess: () => {
              toast.success('Resource removed from featured.');
              setUnfeatureTarget(null);
            },
            onError: () => toast.error('Could not update this resource. Please try again.'),
          });
        }}
      />

      <ConfirmActionDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        title={`Restore "${restoreTarget?.title ?? ''}"?`}
        description="This resource will become publicly visible again, exactly as it was before it was deleted."
        confirmLabel="Restore"
        isPending={restoreMutation.isPending}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget.id, {
            onSuccess: () => {
              toast.success('Resource restored.');
              setRestoreTarget(null);
            },
            onError: () => toast.error('Could not restore this resource. Please try again.'),
          });
        }}
      />
    </PageContainer>
  );
}
