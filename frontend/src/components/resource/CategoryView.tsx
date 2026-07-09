'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid, type ResourceGridView } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { ViewToggle } from '@/components/resource/ViewToggle';
import { Card } from '@/components/ui/card';
import { useCategory } from '@/lib/hooks/useCategories';
import { useResources } from '@/lib/hooks/useResources';
import { useResourceBrowseParams } from '@/lib/hooks/useResourceBrowseParams';
import { ROUTES } from '@/lib/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';
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

interface CategoryViewProps {
  slug: string;
}

export function CategoryView({ slug }: CategoryViewProps) {
  const [view, setView] = useState<ResourceGridView>('grid');
  const category = useCategory(slug);

  const { page, sort, type, language, license, author, verified, tags, updateParams, clearFilters } =
    useResourceBrowseParams();

  const resources = useResources({
    category: slug,
    type,
    language,
    license,
    author,
    verified,
    tags,
    sort: sort as ResourceSort,
    page,
    limit: 20,
  });

  if (category.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (category.isError) {
    if (isAxiosError(category.error) && category.error.response?.status === 404) {
      notFound();
    }
    return (
      <ErrorState
        title="Couldn't load this category"
        onRetry={() => void category.refetch()}
      />
    );
  }

  if (!category.data) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Categories', href: ROUTES.categories }, { label: category.data.name }]} />

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {category.data.name}
        </h1>
        {category.data.description ? (
          <p className="mt-1 text-muted-foreground">{category.data.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-4">
          <FilterSidebar
            showTypeFilter
            type={type}
            onTypeChange={(value) => updateParams({ type: value })}
            showCategoryFilter={false}
            language={language}
            onLanguageChange={(value) => updateParams({ language: value })}
            license={license}
            onLicenseChange={(value) => updateParams({ license: value })}
            author={author}
            onAuthorChange={(value) => updateParams({ author: value })}
            verified={verified}
            onVerifiedChange={(value) => updateParams({ verified: value ? 'true' : undefined })}
            tags={tags}
            onTagsChange={(value) =>
              updateParams({ tags: value && value.length > 0 ? value.join(',') : undefined })
            }
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
