'use client';

import Link from 'next/link';
import {
  Award,
  Bell,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FilePlus2,
  ListChecks,
  Settings,
  Share2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BecomeContributorCard } from '@/components/contributor/BecomeContributorCard';
import { RecentSubmissionsCard } from '@/components/resource/RecentSubmissionsCard';
import { RecentDownloadsCard } from '@/components/resource/RecentDownloadsCard';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyDashboard } from '@/lib/hooks/useMyDashboard';
import { hasContributorAccess } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';

const QUICK_LINKS = [
  { href: ROUTES.submit, label: 'Submit a resource', icon: FilePlus2 },
  { href: ROUTES.mySubmissions, label: 'My submissions', icon: ListChecks },
  { href: ROUTES.bookmarks, label: 'Bookmarks', icon: Bookmark },
  { href: ROUTES.notifications, label: 'Notifications', icon: Bell },
  { href: ROUTES.settings, label: 'Settings', icon: Settings },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading, isError, refetch } = useMyDashboard();

  if (isLoading) {
    return <LoadingScreen label="Loading dashboard…" />;
  }

  if (isError || !stats) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Couldn't load your dashboard"
          description="Something went wrong while fetching your stats."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const contributorStatusLabel = !user
    ? null
    : user.roles.includes('verified_contributor')
      ? 'Verified Contributor'
      : hasContributorAccess(user.roles)
        ? 'Contributor'
        : null;
  const isContributor = Boolean(user && hasContributorAccess(user.roles));

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back{user ? `, ${user.display_name ?? user.username}` : ''}
        </h1>
        {contributorStatusLabel ? <Badge variant="success">{contributorStatusLabel}</Badge> : null}
      </div>
      <p className="mt-1 text-muted-foreground">
        Here&apos;s an overview of your activity on Bangla AI Hub.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total submissions" value={stats.total_submissions} />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published_resources} />
        <StatCard icon={Clock} label="Pending review" value={stats.pending_resources} />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected_resources} />
        <StatCard icon={Eye} label="Total views" value={stats.total_views} />
        <StatCard icon={Download} label="Total downloads" value={stats.total_downloads} />
        <StatCard icon={Bookmark} label="Bookmarks" value={stats.bookmark_count} />
        <StatCard icon={Award} label="Reputation" value={stats.reputation_score} />
      </div>

      <div className="mt-6">
        <BecomeContributorCard />
      </div>

      {isContributor ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard icon={Share2} label="Total shares" value={stats.total_shares} />
            <StatCard icon={BookmarkCheck} label="Bookmarks received" value={stats.total_bookmarks_received} />
          </div>

          {stats.most_downloaded_resource ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="size-4 text-brand" aria-hidden="true" />
                  Most downloaded resource
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Link
                  href={resourceHref(stats.most_downloaded_resource.type, stats.most_downloaded_resource.slug)}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {stats.most_downloaded_resource.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {RESOURCE_TYPE_LABELS[stats.most_downloaded_resource.type] ?? stats.most_downloaded_resource.type}
                  </Badge>
                  <Badge variant="brand">{stats.most_downloaded_resource.download_count} downloads</Badge>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="mt-6">
            <RecentDownloadsCard downloads={stats.recent_downloads} />
          </div>

          <div className="mt-6">
            <RecentSubmissionsCard />
          </div>
        </>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="justify-start gap-2">
              <Link href={href}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {href === ROUTES.notifications && stats.unread_notifications > 0 ? (
                  <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-xs text-brand-foreground">
                    {stats.unread_notifications}
                  </span>
                ) : null}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
