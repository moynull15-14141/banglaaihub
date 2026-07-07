'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Pagination } from '@/components/common/Pagination';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import {
  ContributorApplicationsFilters,
  type ContributorApplicationsFilterValues,
} from '@/components/admin/contributor-applications/ContributorApplicationsFilters';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useAdminContributorApplications } from '@/lib/hooks/useAdmin';
import { formatDate } from '@/lib/utils/format';
import { ROUTES } from '@/lib/constants/routes';
import type { ContributorApplicationStatus } from '@/types/contributor-application';

const EMPTY_FILTERS: ContributorApplicationsFilterValues = {
  search: '',
  country: '',
  profession: '',
  organization: '',
  expertise: '',
};

const PAGE_SIZE = 20;

const TABS: { value: ContributorApplicationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'needs_revision', label: 'Needs revision' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function ContributorApplicationsListView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get('tab') as ContributorApplicationStatus | null) ?? 'pending';
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [filters, setFilters] = useState<ContributorApplicationsFilterValues>(EMPTY_FILTERS);

  const updateParams = (updates: Record<string, string | undefined>) => {
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
  };

  const queryParams = useMemo(
    () => ({
      status: tab,
      sort: sort as 'newest' | 'oldest',
      search: filters.search.trim() || undefined,
      country: filters.country.trim() || undefined,
      profession: filters.profession.trim() || undefined,
      organization: filters.organization.trim() || undefined,
      expertise: filters.expertise.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [tab, sort, filters, page],
  );

  const { data, isLoading, isError, refetch } = useAdminContributorApplications(queryParams);

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Contributor Applications
      </h1>
      <p className="mt-1 text-muted-foreground">
        Review applications from users who want to become contributors.
      </p>

      <div className="mt-6 space-y-4">
        <ContributorApplicationsFilters
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Tabs
            value={tab}
            onValueChange={(value) => updateParams({ tab: value })}
          >
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <SortDropdown
            options={SORT_OPTIONS}
            value={sort}
            onChange={(value) => updateParams({ sort: value })}
          />
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load contributor applications"
            onRetry={() => void refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nothing here"
            description="No applications match the current filter."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {data.data.map((application) => (
              <Card
                key={application.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => router.push(ROUTES.adminContributorApplication(application.id))}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      avatarUrl={application.applicant?.avatar_url}
                      name={
                        application.applicant?.display_name ??
                        application.applicant?.username ??
                        application.full_name
                      }
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{application.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {application.expertise}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(application.submitted_at)}
                    </span>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </PageContainer>
  );
}
