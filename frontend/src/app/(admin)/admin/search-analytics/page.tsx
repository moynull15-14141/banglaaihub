'use client';

import { Search, SearchX, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminSearchAnalytics } from '@/lib/hooks/useAdmin';

// Gated the same as the (admin) layout's default — GET /admin/search-analytics
// requires system:audit_log_view, an admin-tier permission (same as audit logs).
export default function AdminSearchAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <SearchAnalyticsContent />
    </RoleGuard>
  );
}

function SearchAnalyticsContent() {
  const { data, isLoading, isError, refetch } = useAdminSearchAnalytics();

  if (isLoading) {
    return <LoadingScreen label="Loading search analytics…" />;
  }

  if (isError || !data) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Couldn't load search analytics"
          description="Something went wrong while fetching search analytics."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Search Analytics
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Last 7 days</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Search} label="Total searches" value={data.total_searches} />
        <StatCard icon={TrendingUp} label="Distinct top queries" value={data.top_queries.length} />
        <StatCard icon={SearchX} label="Queries with no results" value={data.no_result_queries.length} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueryListCard title="Top queries" entries={data.top_queries} emptyLabel="No searches yet." />
        <QueryListCard
          title="No-result queries"
          entries={data.no_result_queries}
          emptyLabel="No zero-result searches — nice."
        />
      </div>
    </PageContainer>
  );
}

function QueryListCard({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: { query: string; count: number }[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {entries.map((entry) => (
              <li key={entry.query} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{entry.query}</span>
                <Badge variant="outline" className="shrink-0">
                  {entry.count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
