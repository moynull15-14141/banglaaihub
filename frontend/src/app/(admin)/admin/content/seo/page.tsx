'use client';

import { AlertTriangle, FileText, Image as ImageIcon, Link2, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { StatCard } from '@/components/common/StatCard';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSeoDashboard } from '@/lib/hooks/useSeo';

// Gated the same tier as the Articles nav entry (content:edit, editor+) —
// this measures the content editors themselves author, not an admin-only
// concern. No per-article analytics here (views/CTR) — explicitly out of
// scope per the brief; every number is derived straight from Article fields.
export default function AdminSeoDashboardPage() {
  return (
    <RoleGuard allowedRoles={['editor', 'admin', 'super_admin']}>
      <SeoDashboardContent />
    </RoleGuard>
  );
}

function SeoDashboardContent() {
  const { data, isLoading, isError, refetch } = useSeoDashboard();

  if (isLoading) {
    return <LoadingScreen label="Loading SEO dashboard…" />;
  }

  if (isError || !data) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Couldn't load the SEO dashboard"
          description="Something went wrong while fetching SEO data."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">SEO Center</h1>
      <p className="mt-1 text-sm text-muted-foreground">{data.article_count} article(s) analyzed</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard icon={TrendingUp} label="Average SEO score" value={data.average_score} />
        <StatCard icon={FileText} label="Missing meta description" value={data.missing_meta_description} />
        <StatCard icon={ImageIcon} label="Missing OG image" value={data.missing_og_image} />
        <StatCard icon={Link2} label="Missing canonical" value={data.missing_canonical} />
        <StatCard icon={AlertTriangle} label="Missing focus keyword" value={data.missing_focus_keyword} />
        <StatCard icon={FileText} label="Low word count (<300)" value={data.low_word_count} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DuplicateListCard
          title="Duplicate titles"
          entries={data.duplicate_titles.map((d) => ({ label: d.title, count: d.count }))}
          emptyLabel="No duplicate titles found."
        />
        <DuplicateListCard
          title="Duplicate meta descriptions"
          entries={data.duplicate_descriptions.map((d) => ({ label: d.description, count: d.count }))}
          emptyLabel="No duplicate descriptions found."
        />
      </div>
    </PageContainer>
  );
}

function DuplicateListCard({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: { label: string; count: number }[];
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
              <li key={entry.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{entry.label}</span>
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
