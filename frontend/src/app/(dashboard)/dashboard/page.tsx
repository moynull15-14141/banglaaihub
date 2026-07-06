'use client';

import Link from 'next/link';
import {
  Award,
  Bell,
  Bookmark,
  CheckCircle2,
  Clock,
  FilePlus2,
  ListChecks,
  Settings,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyDashboard } from '@/lib/hooks/useMyDashboard';
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

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Welcome back{user ? `, ${user.display_name ?? user.username}` : ''}
      </h1>
      <p className="mt-1 text-muted-foreground">
        Here&apos;s an overview of your activity on Bangla AI Hub.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={ListChecks} label="Total submissions" value={stats.total_submissions} />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published_resources} />
        <StatCard icon={Clock} label="Pending review" value={stats.pending_resources} />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected_resources} />
        <StatCard icon={Bookmark} label="Bookmarks" value={stats.bookmark_count} />
        <StatCard icon={Award} label="Reputation" value={stats.reputation_score} />
      </div>

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
