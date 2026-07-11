'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Pagination } from '@/components/common/Pagination';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { useResources } from '@/lib/hooks/useResources';
import { ROUTES } from '@/lib/constants/routes';
import { formatDate } from '@/lib/utils/format';
import type { ListResourcesParams, ResourceStatus } from '@/types/resource';

const PAGE_SIZE = 20;

type ArticleTab = 'draft' | 'scheduled' | 'approved' | 'archived';

const TAB_LABELS: Record<ArticleTab, string> = {
  draft: 'Drafts',
  scheduled: 'Scheduled',
  approved: 'Published',
  archived: 'Archived',
};

export function ArticlesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = (searchParams.get('tab') as ArticleTab | null) ?? 'draft';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!('page' in updates)) params.delete('page');
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo<ListResourcesParams>(
    () => ({
      type: 'article',
      status: tab as ResourceStatus,
      sort: 'updated',
      page,
      limit: PAGE_SIZE,
    }),
    [tab, page],
  );

  const { data, isLoading, isError, refetch } = useResources(queryParams);
  const articles = data?.data ?? [];

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Articles</h1>
          <p className="mt-1 text-muted-foreground">
            Write, publish, and schedule articles, tutorials, and announcements.
          </p>
        </div>
        <Button onClick={() => router.push(ROUTES.adminContentArticleNew)}>
          <Plus className="size-4" aria-hidden="true" />
          New article
        </Button>
      </div>

      <div className="mt-6">
        <Tabs value={tab} onValueChange={(value) => updateParams({ tab: value })}>
          <TabsList>
            {(Object.keys(TAB_LABELS) as ArticleTab[]).map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load articles"
            description="Something went wrong while fetching articles."
            onRetry={() => void refetch()}
          />
        ) : articles.length === 0 ? (
          <EmptyState icon={FileText} title="No articles here" description="Nothing matches this tab yet." />
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
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30">
                    <td className="max-w-96 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.adminContentArticleEdit(article.slug))}
                        className="line-clamp-1 text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                      >
                        {article.title}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDate(article.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data ? (
          <Pagination
            page={page}
            limit={data.meta.limit ?? PAGE_SIZE}
            total={data.meta.total ?? 0}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
