'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useAdminContributorApplications } from '@/lib/hooks/useAdmin';
import { ROUTES } from '@/lib/constants/routes';

// No status filter — this is a cross-status "recent activity" feed (Feature 11's
// "Recent Applications"), unlike the sibling PendingApprovalsCard which is
// pending-only.
export function RecentContributorApplicationsCard() {
  const { data, isLoading, isError, refetch } = useAdminContributorApplications({ limit: 5 });
  const applications = data?.data ?? [];

  return (
    <AdminListCard
      title="Recent contributor applications"
      viewAllHref={ROUTES.adminContributorApplications}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={applications.length === 0}
      emptyLabel="No applications yet."
    >
      <ul className="flex flex-col divide-y">
        {applications.map((application) => (
          <li key={application.id}>
            <Link
              href={ROUTES.adminContributorApplication(application.id)}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  avatarUrl={application.applicant?.avatar_url}
                  name={application.applicant?.display_name ?? application.applicant?.username ?? application.full_name}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{application.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    submitted {formatDistanceToNow(new Date(application.submitted_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <ApplicationStatusBadge status={application.status} />
            </Link>
          </li>
        ))}
      </ul>
    </AdminListCard>
  );
}
