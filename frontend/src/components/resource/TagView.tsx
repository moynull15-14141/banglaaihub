'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Hash } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid, type ResourceGridView } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { ViewToggle } from '@/components/resource/ViewToggle';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTag } from '@/lib/hooks/useTags';
import { useResources } from '@/lib/hooks/useResources';
import { useResourceBrowseParams } from '@/lib/hooks/useResourceBrowseParams';
import { ROUTES } from '@/lib/constants/routes';
import type { ResourceSort } from '@/types/resource';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'downloads', label: 'Most downloaded' },
  { value: 'bookmarks', label: 'Most bookmarked' },
  { value: 'trending', label: 'Trending' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'alpha', label: 'Alphabetical' },
];

interface TagViewProps {
  slug: string;
}

export function TagView({ slug }: TagViewProps) {
  const [view, setView] = useState<ResourceGridView>('grid');
  const tag = useTag(slug);

  const { page, sort, type, category, language, license, author, verified, updateParams, clearFilters } =
    useResourceBrowseParams();

  const resources = useResources({
    tags: [slug],
    type,
    category,
    language,
    license,
    author,
    verified,
    sort: sort as ResourceSort,
    page,
    limit: 20,
  });

  if (tag.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (tag.isError) {
    if (isAxiosError(tag.error) && tag.error.response?.status === 404) {
      notFound();
    }
    return <ErrorState title="Couldn't load this tag" onRetry={() => void tag.refetch()} />;
  }

  if (!tag.data) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Tags', href: ROUTES.resources }, { label: tag.data.name }]} />

      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          <Hash className="size-6 text-brand" aria-hidden="true" />
          {tag.data.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {tag.data.usage_count} {tag.data.usage_count === 1 ? 'resource' : 'resources'} tagged
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-4">
          <FilterSidebar
            showTypeFilter
            type={type}
            onTypeChange={(value) => updateParams({ type: value })}
            category={category}
            onCategoryChange={(value) => updateParams({ category: value })}
            language={language}
            onLanguageChange={(value) => updateParams({ language: value })}
            license={license}
            onLicenseChange={(value) => updateParams({ license: value })}
            author={author}
            onAuthorChange={(value) => updateParams({ author: value })}
            verified={verified}
            onVerifiedChange={(value) => updateParams({ verified: value ? 'true' : undefined })}
            onClear={clearFilters}
          />
        </Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {resources.data ? `${resources.data.meta.total ?? 0} results` : null}
            </p>
            <div className="flex items-center gap-2">
              <ViewToggle value={view} onChange={setView} />
              <SortDropdown
                options={SORT_OPTIONS}
                value={sort}
                onChange={(value) => updateParams({ sort: value })}
              />
            </div>
          </div>
          <ResourceGrid
            resources={resources.data?.data}
            isLoading={resources.isLoading}
            isError={resources.isError}
            onRetry={() => void resources.refetch()}
            view={view}
          />
          {resources.data ? (
            <Pagination
              page={page}
              limit={resources.data.meta.limit ?? 20}
              total={resources.data.meta.total ?? 0}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
