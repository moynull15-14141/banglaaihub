'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid, type ResourceGridView } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { ViewToggle } from '@/components/resource/ViewToggle';
import { Pagination } from '@/components/common/Pagination';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useResources } from '@/lib/hooks/useResources';
import { useResourceBrowseParams } from '@/lib/hooks/useResourceBrowseParams';
import type { ResourceSort, ResourceType } from '@/types/resource';

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

interface ResourceListingViewProps {
  title: string;
  description?: string;
  fixedType?: ResourceType;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ResourceListingView({
  title,
  description,
  fixedType,
  emptyTitle,
  emptyDescription,
}: ResourceListingViewProps) {
  const [view, setView] = useState<ResourceGridView>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    page,
    sort,
    type,
    category,
    language,
    license,
    author,
    verified,
    tags,
    updateParams,
    clearFilters,
  } = useResourceBrowseParams({ fixedType });

  const { data, isLoading, isError, refetch } = useResources({
    type,
    category,
    language,
    license,
    author,
    verified,
    tags,
    sort: sort as ResourceSort,
    page,
    limit: 20,
  });

  // Drives the mobile "Filters" trigger's count badge — how many filter
  // dimensions are currently active, independent of the always-on sort/type.
  const activeFilterCount = [
    !fixedType && type,
    category,
    language,
    license,
    author,
    verified,
    tags && tags.length > 0,
  ].filter(Boolean).length;

  // Same props feed both the always-visible desktop sidebar and the
  // mobile-only Sheet — two live instances is simpler than portaling one
  // FilterSidebar between a Card and a Sheet, and only one is ever visible.
  const filterSidebarProps = {
    showTypeFilter: !fixedType,
    type,
    onTypeChange: !fixedType ? (value: string | undefined) => updateParams({ type: value }) : undefined,
    category,
    onCategoryChange: (value: string | undefined) => updateParams({ category: value }),
    language,
    onLanguageChange: (value: string | undefined) => updateParams({ language: value }),
    license,
    onLicenseChange: (value: string | undefined) => updateParams({ license: value }),
    author,
    onAuthorChange: (value: string | undefined) => updateParams({ author: value }),
    verified,
    onVerifiedChange: (value: boolean) => updateParams({ verified: value ? 'true' : undefined }),
    tags,
    onTagsChange: (value: string[] | undefined) =>
      updateParams({ tags: value && value.length > 0 ? value.join(',') : undefined }),
    onClear: clearFilters,
  };

  return (
    <PageContainer>
      <SectionHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <Card className="hidden h-fit p-4 lg:block">
          <FilterSidebar {...filterSidebarProps} />
        </Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {data ? `${data.meta.total ?? 0} results` : null}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters
                {activeFilterCount > 0 ? (
                  <Badge variant="brand" className="h-4 min-w-4 px-1 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
              <ViewToggle value={view} onChange={setView} />
              <SortDropdown
                options={SORT_OPTIONS}
                value={sort}
                onChange={(value) => updateParams({ sort: value })}
              />
            </div>
          </div>
          <ResourceGrid
            resources={data?.data}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            view={view}
          />
          {data ? (
            <Pagination
              page={page}
              limit={data.meta.limit ?? 20}
              total={data.meta.total ?? 0}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
            />
          ) : null}
        </div>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterSidebar {...filterSidebarProps} showHeading={false} />
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
