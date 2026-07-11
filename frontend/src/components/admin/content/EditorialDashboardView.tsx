'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { PageContainer } from '@/components/common/PageContainer';
import { useResources } from '@/lib/hooks/useResources';
import { useAssignedToMe } from '@/lib/hooks/useArticleAssignment';
import { ROUTES } from '@/lib/constants/routes';
import { formatDate } from '@/lib/utils/format';
import type { ListResourcesParams, ResourceStatus } from '@/types/resource';

function MiniArticleList({ title, status, sort }: { title: string; status?: ResourceStatus; sort?: ListResourcesParams['sort'] }) {
  const { data, isLoading } = useResources({ type: 'article', status, sort: sort ?? 'updated', limit: 6 });
  const articles = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {articles.map((article) => (
              <li key={article.id} className="py-2">
                <Link
                  href={ROUTES.adminContentArticleEdit(article.slug)}
                  className="line-clamp-1 text-sm font-medium hover:underline"
                >
                  {article.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(article.updated_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AssignedToMeCard() {
  const { data, isLoading } = useAssignedToMe();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assigned to Me</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing assigned to you.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.map((entry) => (
              <li key={`${entry.resource.slug}-${entry.role}`} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={ROUTES.adminContentArticleEdit(entry.resource.slug)}
                    className="line-clamp-1 text-sm font-medium hover:underline"
                  >
                    {entry.resource.title}
                  </Link>
                  <StatusBadge status={entry.resource.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  As {entry.role.replace('_', ' ')} · {formatDate(entry.assigned_at)}
                  {entry.due_date ? ` · due ${formatDate(entry.due_date)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// Editorial Dashboard (Phase 5A-3) — every section is a filtered
// useResources() query, and "Assigned to Me" reuses
// ArticleAssignmentService.listAssignedToMe() — no new aggregate backend
// endpoint needed for this page.
export function EditorialDashboardView() {
  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Editorial Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Everything moving through the editorial pipeline.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MiniArticleList title="Drafts" status="draft" />
        <MiniArticleList title="In Review" status="in_review" />
        <MiniArticleList title="SEO Review" status="seo_review" />
        <MiniArticleList title="Needs Changes" status="needs_changes" />
        <MiniArticleList title="Ready to Publish" status="ready_to_publish" />
        <MiniArticleList title="Scheduled" status="scheduled" />
        <MiniArticleList title="Published" status="approved" />
        <MiniArticleList title="Archived" status="archived" />
        <AssignedToMeCard />
        <MiniArticleList title="Recently Updated" sort="updated" />
      </div>
    </PageContainer>
  );
}
