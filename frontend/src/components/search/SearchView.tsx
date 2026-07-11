'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FilterSidebar } from '@/components/resource/FilterSidebar';
import { ResourceGrid, type ResourceGridView } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { TrendingResourcesCard } from '@/components/resource/TrendingResourcesCard';
import { ViewToggle } from '@/components/resource/ViewToggle';
import { PeopleSearchResults } from '@/components/search/PeopleSearchResults';
import { SearchBar } from '@/components/search/SearchBar';
import { Pagination } from '@/components/common/Pagination';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearch, usePopularSearches } from '@/lib/hooks/useSearch';
import { useResourceBrowseParams } from '@/lib/hooks/useResourceBrowseParams';
import { useRecentSearches } from '@/lib/hooks/useRecentSearches';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most viewed' },
];

export function SearchView() {
  const [view, setView] = useState<ResourceGridView>('grid');
  const [searchMode, setSearchMode] = useState<'resources' | 'people'>('resources');
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
  } = useResourceBrowseParams({ defaultSort: 'relevance', navigate: 'replace' });

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);

  const { data, isLoading, isError, refetch } = useSearch({
    q: query,
    type,
    category,
    language,
    license,
    author,
    verified,
    tags,
    sort: sort as 'relevance' | 'newest' | 'popular',
    page,
    limit: 20,
  });

  const { recent, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const { data: popular } = usePopularSearches();

  // Search-as-you-type (debounced) just updates the query; only an explicit
  // submit (Enter) is worth remembering as a "recent search".
  function handleQueryChange(value: string) {
    setQuery(value);
    updateParams({ q: value || undefined });
  }

  function handleSubmit(value: string) {
    handleQueryChange(value);
    addRecentSearch(value);
  }

  const activeFilterCount = [type, category, language, license, author, verified, tags && tags.length > 0].filter(
    Boolean,
  ).length;

  const filterSidebarProps = {
    showTypeFilter: true,
    type,
    onTypeChange: (value: string | undefined) => updateParams({ type: value }),
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
    <div className="space-y-6">
      <SearchBar
        defaultValue={initialQuery}
        onSubmit={handleSubmit}
        onDebouncedChange={handleQueryChange}
        autoFocus
        showSuggestions
      />

      {query.trim().length > 0 ? (
        <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as 'resources' | 'people')}>
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {query.trim().length === 0 ? (
        <div className="space-y-6">
          <EmptyResults
            title="Search Bangla AI Hub"
            description="Type a query above to search datasets, papers, tools, and tutorials."
          />
          {recent.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Recent searches</p>
                <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((entry) => (
                  <Badge
                    key={entry}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handleSubmit(entry)}
                  >
                    {entry}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {popular && popular.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((entry) => (
                  <Badge
                    key={entry.query}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleSubmit(entry.query)}
                  >
                    {entry.query}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : searchMode === 'people' ? (
        <PeopleSearchResults query={query} />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          <div className="hidden space-y-4 lg:block">
            <Card className="h-fit p-4">
              <FilterSidebar {...filterSidebarProps} />
            </Card>
            <TrendingResourcesCard />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {data ? `${data.meta.total ?? 0} results for "${query}"` : null}
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

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent side="left" className="overflow-y-auto p-4">
              <SheetHeader className="p-0">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <FilterSidebar {...filterSidebarProps} showHeading={false} />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
