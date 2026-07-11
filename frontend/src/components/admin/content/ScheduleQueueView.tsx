'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/components/common/PageContainer';
import { useResources } from '@/lib/hooks/useResources';
import { ROUTES } from '@/lib/constants/routes';
import { formatDate } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketFor(article: Resource, now: Date): 'missed' | 'today' | 'tomorrow' | 'this_week' | 'upcoming' {
  const scheduledAt = article.article?.scheduled_at;
  if (!scheduledAt) return 'upcoming';
  const date = new Date(scheduledAt);
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  if (date < now) return 'missed';
  if (startOfDay(date).getTime() === today.getTime()) return 'today';
  if (startOfDay(date).getTime() === tomorrow.getTime()) return 'tomorrow';
  if (date < weekEnd) return 'this_week';
  return 'upcoming';
}

const BUCKET_LABELS: Record<ReturnType<typeof bucketFor>, string> = {
  missed: 'Missed Schedule',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  upcoming: 'Upcoming',
};

// "Missed" (scheduledAt in the past but still status='scheduled') is an
// ops-visibility signal that the scheduled-publish job
// (backend/src/jobs/scheduledPublish.job.ts, 5A-1) may be down — that job
// normally flips these to `approved` within 60s, so anything sitting here
// past its time is worth a human's attention.
export function ScheduleQueueView() {
  const { data, isLoading } = useResources({ type: 'article', status: 'scheduled', sort: 'newest', limit: 100 });
  const now = useMemo(() => new Date(), []);

  const buckets = useMemo(() => {
    const grouped: Record<string, Resource[]> = { missed: [], today: [], tomorrow: [], this_week: [], upcoming: [] };
    for (const article of data?.data ?? []) {
      grouped[bucketFor(article, now)].push(article);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        const aTime = a.article?.scheduled_at ? new Date(a.article.scheduled_at).getTime() : 0;
        const bTime = b.article?.scheduled_at ? new Date(b.article.scheduled_at).getTime() : 0;
        return aTime - bTime;
      });
    }
    return grouped;
  }, [data, now]);

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Schedule Queue</h1>
      <p className="mt-1 text-muted-foreground">Every article waiting to publish automatically.</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(['missed', 'today', 'tomorrow', 'this_week', 'upcoming'] as const).map((bucket) => (
            <Card key={bucket} className={bucket === 'missed' && buckets[bucket].length > 0 ? 'border-destructive/50' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {bucket === 'missed' && buckets[bucket].length > 0 ? (
                    <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
                  ) : null}
                  {BUCKET_LABELS[bucket]}
                  <Badge variant="outline">{buckets[bucket].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {buckets[bucket].length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here.</p>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {buckets[bucket].map((article) => (
                      <li key={article.id} className="py-2">
                        <Link
                          href={ROUTES.adminContentArticleEdit(article.slug)}
                          className="line-clamp-1 text-sm font-medium hover:underline"
                        >
                          {article.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {article.article?.scheduled_at ? formatDate(article.article.scheduled_at) : '—'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
