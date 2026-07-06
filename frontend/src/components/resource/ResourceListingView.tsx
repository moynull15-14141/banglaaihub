'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { Pagination } from '@/components/common/Pagination';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useResources } from '@/lib/hooks/useResources';
import type { ResourceLanguage, ResourceSort, ResourceType } from '@/types/resource';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'downloads', label: 'Most downloaded' },
  { value: 'bookmarks', label: 'Most bookmarked' },
];

interface ResourceListingViewProps {
  title: string;
  description?: string;
  fixedType?: ResourceType;
}

export function ResourceListingView({ title, description, fixedType }: ResourceListingViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const sort = (searchParams.get('sort') as ResourceSort | null) ?? 'newest';
  const category = searchParams.get('category') ?? undefined;
  const language = (searchParams.get('language') as ResourceLanguage | null) ?? undefined;
  const type = fixedType ?? ((searchParams.get('type') as ResourceType | null) ?? undefined);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      // Any filter/sort change restarts pagination from page 1.
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo(
    () => ({ type, category, language, sort, page, limit: 20 }),
    [type, category, language, sort, page],
  );

  const { data, isLoading, isError, refetch } = useResources(queryParams);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <FilterSidebar
          showTypeFilter={!fixedType}
          type={type}
          onTypeChange={!fixedType ? (value) => updateParams({ type: value }) : undefined}
          category={category}
          onCategoryChange={(value) => updateParams({ category: value })}
          language={language}
          onLanguageChange={(value) => updateParams({ language: value })}
          onClear={() =>
            updateParams({ type: fixedType, category: undefined, language: undefined, page: undefined })
          }
        />
        <div className="space-y-4">
          <div className="flex justify-end">
            <SortDropdown
              options={SORT_OPTIONS}
              value={sort}
              onChange={(value) => updateParams({ sort: value })}
            />
          </div>
          <ResourceGrid
            resources={data?.data}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
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
    </div>
  );
}
