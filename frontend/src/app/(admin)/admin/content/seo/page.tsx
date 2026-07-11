'use client';

import Link from 'next/link';
import { AlertTriangle, FileText, Image as ImageIcon, Link2, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/common/StatCard';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { ROUTES } from '@/lib/constants/routes';
import { useSeoDashboard } from '@/lib/hooks/useSeo';
import type { SeoDashboardArticle } from '@/lib/api/seo';
import type { ResourceStatus } from '@/types/resource';

// Gated the same tier as the Articles nav entry (content:edit, editor+) —
// this measures the content editors themselves author, not an admin-only
// concern. No per-article analytics here (views/CTR) — that data isn't
// tracked per-article anywhere yet; everything below is derived straight
// from Article/Resource fields already in the database.
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

      <div className="mt-6">
        <ArticleScoreTable articles={data.articles} />
      </div>
    </PageContainer>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

// The whole point of a "dashboard" is finding what needs fixing — a single
// average score gives no way to act on it. This surfaces the same per-article
// score the average is built from (worst-first, per SeoService.getDashboard),
// each row linking straight into that article's editor.
function ArticleScoreTable({ articles }: { articles: SeoDashboardArticle[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Articles by SEO score</CardTitle>
        <CardDescription>Worst-scoring first — click a row to open it in the editor.</CardDescription>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <EmptyState title="No articles yet" description="Scores will appear here once articles are created." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    SEO score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {articles.map((article) => (
                  <tr key={article.slug} className="hover:bg-muted/30">
                    <td className="max-w-96 px-4 py-3">
                      <Link
                        href={ROUTES.adminContentArticleEdit(article.slug)}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={article.status as ResourceStatus} />
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${scoreColor(article.score)}`}>
                      {article.score}
                      <span className="font-normal text-muted-foreground">/100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
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
