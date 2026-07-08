'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { Pagination } from '@/components/common/Pagination';
import { useMySubmissions } from '@/lib/hooks/useMySubmissions';
import { usePagination } from '@/lib/hooks/usePagination';
import { ROUTES } from '@/lib/constants/routes';
import type { SubmissionStatusFilter } from '@/lib/api/users';

const STATUS_TABS: { value: SubmissionStatusFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'published', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// "My Resources" / submission history — reuses the existing
// GET /users/me/submissions endpoint (already supports status filter +
// pagination) rather than a new one, and the same ResourceGrid/Pagination
// used by every public listing page.
export function MySubmissionsView() {
  const [status, setStatus] = useState<SubmissionStatusFilter | 'all'>('all');
  const { page, limit, setPage, reset } = usePagination({ initialLimit: 12 });

  const { data, isLoading, isError, refetch } = useMySubmissions({
    status: status === 'all' ? undefined : status,
    page,
    limit,
  });

  function handleStatusChange(value: string) {
    setStatus(value as SubmissionStatusFilter | 'all');
    reset();
  }

  return (
    <PageContainer>
      <SectionHeader title="My Submissions" description="Track the status of everything you've submitted." />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button asChild size="sm">
          <Link href={ROUTES.submit}>Submit a resource</Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <ResourceGrid
          resources={data?.data}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No submissions yet"
          emptyDescription="Resources you submit will show up here with their review status."
          showStatus
          showOwnerActions
        />
        {data ? (
          <Pagination
            page={page}
            limit={data.meta.limit ?? limit}
            total={data.meta.total ?? 0}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
