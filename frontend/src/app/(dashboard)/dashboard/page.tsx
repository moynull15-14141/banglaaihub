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
  Pin,
  Settings,
  Share2,
  Trophy,
  UserPlus,
  Users,
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
import { RecentNotificationsCard } from '@/components/notification/RecentNotificationsCard';
import { PinnedResourcesEditor } from '@/components/user/PinnedResourcesSection';
import { UserAvatar } from '@/components/user/UserAvatar';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyDashboard } from '@/lib/hooks/useMyDashboard';
import { hasContributorAccess } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';

function trendLabel(thisMonth: number, lastMonth: number): string {
  if (lastMonth === 0) return thisMonth > 0 ? 'New this month' : 'No change';
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs. last month`;
}

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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total submissions" value={stats.total_submissions} />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published_resources} />
        <StatCard icon={Clock} label="Pending review" value={stats.pending_resources} />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected_resources} />
        <StatCard icon={Eye} label="Total views" value={stats.total_views} />
        <StatCard icon={Download} label="Total downloads" value={stats.total_downloads} />
        <StatCard icon={Bookmark} label="Bookmarks" value={stats.bookmark_count} />
        <StatCard icon={Award} label="Reputation" value={stats.reputation_score} />
        <StatCard
          icon={Users}
          label="Followers"
          value={stats.follower_count}
          hint={trendLabel(stats.monthly_summary.views.this_month, stats.monthly_summary.views.last_month)}
        />
        <StatCard icon={UserPlus} label="Following" value={stats.following_count} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${stats.profile_completion_percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{stats.profile_completion_percent}% complete</p>
            {stats.profile_completion_percent < 100 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.settingsProfile}>Complete your profile</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">{stats.community_stats.total_users}</strong> members
            </p>
            <p>
              <strong className="text-foreground">{stats.community_stats.total_resources}</strong> resources
              published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">{stats.monthly_summary.views.this_month}</strong> views (
              {trendLabel(stats.monthly_summary.views.this_month, stats.monthly_summary.views.last_month)})
            </p>
            <p>
              <strong className="text-foreground">{stats.monthly_summary.downloads.this_month}</strong> downloads
            </p>
            <p>
              <strong className="text-foreground">{stats.monthly_summary.submissions.this_month}</strong>{' '}
              submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.recent_followers.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-brand" aria-hidden="true" />
              Recent followers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent_followers.map((follower) => (
              <Link
                key={follower.id}
                href={ROUTES.userProfile(follower.username)}
                className="flex items-center gap-3 hover:underline"
              >
                <UserAvatar avatarUrl={follower.avatar_url} name={follower.display_name ?? follower.username} size="sm" />
                <span className="text-sm">{follower.display_name ?? follower.username}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {stats.pinned_resources.length > 0 || isContributor ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pin className="size-4 text-brand" aria-hidden="true" />
              Pinned resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PinnedResourcesEditor />
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6">
        <BecomeContributorCard />
      </div>

      <div className="mt-6">
        <RecentNotificationsCard />
      </div>

      {isContributor ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
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
        <CardContent className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="outline" className="justify-start gap-2">
              <Link href={href}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
                {href === ROUTES.notifications && stats.unread_notifications > 0 ? (
                  <span className="ml-auto shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-xs text-brand-foreground">
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
