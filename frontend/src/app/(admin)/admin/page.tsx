'use client';

import { ClipboardList, Flag, TrendingUp, Users } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { ResourceStatusBreakdown } from '@/components/admin/ResourceStatusBreakdown';
import { ResourceTypeBreakdown } from '@/components/admin/ResourceTypeBreakdown';
import { RecentResourcesCard } from '@/components/admin/RecentResourcesCard';
import { RecentUsersCard } from '@/components/admin/RecentUsersCard';
import { PendingApprovalsCard } from '@/components/admin/PendingApprovalsCard';
import { QuickActionsCard } from '@/components/admin/QuickActionsCard';
import { ActivityFeedCard } from '@/components/admin/ActivityFeedCard';
import { useAdminDashboard } from '@/lib/hooks/useAdmin';

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useAdminDashboard();

  if (isLoading) {
    return <LoadingScreen label="Loading dashboard…" />;
  }

  if (isError || !stats) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Couldn't load the dashboard"
          description="Something went wrong while fetching admin statistics."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const reportsPending = stats.reports_by_status.pending ?? 0;

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Dashboard Overview
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.total_users} />
        <StatCard
          icon={TrendingUp}
          label="New users"
          value={stats.new_users_last_7_days}
          hint="Last 7 days"
        />
        <StatCard icon={ClipboardList} label="Pending approvals" value={stats.pending_approvals} />
        <StatCard icon={Flag} label="Open reports" value={reportsPending} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ResourceStatusBreakdown data={stats.resources_by_status} />
        <ResourceTypeBreakdown data={stats.resources_by_type} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <PendingApprovalsCard />
          <RecentResourcesCard />
        </div>
        <div className="flex flex-col gap-4">
          <QuickActionsCard />
          <RecentUsersCard />
        </div>
      </div>

      <div className="mt-6">
        <ActivityFeedCard />
      </div>
    </PageContainer>
  );
}
