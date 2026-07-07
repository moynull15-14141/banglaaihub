import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import { formatDate } from '@/lib/utils/format';
import { ROUTES } from '@/lib/constants/routes';
import type { ContributorApplicationHistoryEntry } from '@/types/contributor-application';

interface ApplicationHistoryTimelineProps {
  entries: ContributorApplicationHistoryEntry[];
  // Admin view links each entry to its own review page; applicants have no
  // per-application detail route, so their history renders as plain rows.
  linkToDetail?: boolean;
}

// Reused on both the applicant's own status page and the admin review page —
// same data shape (see ContributorApplicationHistoryEntry), only the linking
// behavior differs between the two contexts.
export function ApplicationHistoryTimeline({
  entries,
  linkToDetail = false,
}: ApplicationHistoryTimelineProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous applications</CardTitle>
        <CardDescription>Earlier attempts, most recent first.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {entries.map((entry) => {
          const row = (
            <div className="flex flex-col gap-1 rounded-lg border border-border/60 p-3 text-sm transition-colors hover:bg-muted/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ApplicationStatusBadge status={entry.status} />
                <span className="text-xs text-muted-foreground">
                  Submitted {formatDate(entry.submitted_at)}
                  {entry.reviewed_at ? ` · Reviewed ${formatDate(entry.reviewed_at)}` : ''}
                </span>
              </div>
              {entry.feedback_to_applicant ? (
                <p className="whitespace-pre-line text-muted-foreground">
                  {entry.feedback_to_applicant}
                </p>
              ) : null}
            </div>
          );

          return linkToDetail ? (
            <Link key={entry.id} href={ROUTES.adminContributorApplication(entry.id)}>
              {row}
            </Link>
          ) : (
            <div key={entry.id}>{row}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
