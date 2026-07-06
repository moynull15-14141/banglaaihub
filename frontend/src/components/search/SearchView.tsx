'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { SearchBar } from '@/components/search/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { Card } from '@/components/ui/card';
import { useSearch } from '@/lib/hooks/useSearch';
import type { ResourceLanguage, ResourceType } from '@/types/resource';
import type { SearchSort } from '@/types/search';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most viewed' },
];

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const sort = (searchParams.get('sort') as SearchSort | null) ?? 'relevance';
  const category = searchParams.get('category') ?? undefined;
  const language = (searchParams.get('language') as ResourceLanguage | null) ?? undefined;
  const type = (searchParams.get('type') as ResourceType | null) ?? undefined;

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
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo(
    () => ({ q: query, type, category, language, sort, page, limit: 20 }),
    [query, type, category, language, sort, page],
  );

  const { data, isLoading, isError, refetch } = useSearch(queryParams);

  return (
    <div className="space-y-6">
      <SearchBar
        defaultValue={initialQuery}
        onSubmit={(value) => {
          setQuery(value);
          updateParams({ q: value });
        }}
        onDebouncedChange={(value) => {
          setQuery(value);
          updateParams({ q: value });
        }}
        autoFocus
      />

      {query.trim().length === 0 ? (
        <EmptyResults
          title="Search Bangla AI Hub"
          description="Type a query above to search datasets, papers, tools, and tutorials."
        />
      ) : (
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
              onClear={() =>
                updateParams({ type: undefined, category: undefined, language: undefined, page: undefined })
              }
            />
          </Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {data ? `${data.meta.total ?? 0} results for "${query}"` : null}
              </p>
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
      )}
    </div>
  );
}
