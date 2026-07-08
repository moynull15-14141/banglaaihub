'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/common/Pagination';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { useMyBookmarks } from '@/lib/hooks/useBookmarks';
import { usePagination } from '@/lib/hooks/usePagination';
import type { BookmarkSort } from '@/lib/api/users';

const SORT_OPTIONS: { value: BookmarkSort; label: string }[] = [
  { value: 'newest', label: 'Recently bookmarked' },
  { value: 'oldest', label: 'Oldest bookmarked' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'downloads', label: 'Most downloaded' },
];

// Bookmarks list — same ResourceGrid/Pagination pattern as My Submissions
// and every public listing page, against GET /users/me/bookmarks (already
// pagination + sort capable). Free-text search has no server-side
// equivalent on this endpoint (same known limitation as the admin
// moderation queue's search box) — it filters only the current page.
export function BookmarksView() {
  const [sort, setSort] = useState<BookmarkSort>('newest');
  const [search, setSearch] = useState('');
  const { page, limit, setPage, reset } = usePagination({ initialLimit: 12 });

  const { data, isLoading, isError, refetch } = useMyBookmarks({ sort, page, limit });

  const filteredResources = useMemo(() => {
    const rows = data?.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (resource) =>
        resource.title.toLowerCase().includes(query) ||
        (resource.description?.toLowerCase().includes(query) ?? false),
    );
  }, [data, search]);

  function handleSortChange(value: string) {
    setSort(value as BookmarkSort);
    reset();
  }

  return (
    <PageContainer>
      <SectionHeader title="Bookmarks" description="Datasets, papers, and tools you've saved." />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="relative flex-1 sm:min-w-56 sm:max-w-sm">
          <Label htmlFor="bookmarks-search" className="sr-only">
            Search your bookmarks
          </Label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="bookmarks-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this page…"
            className="pl-9"
          />
        </div>
        <SortDropdown options={SORT_OPTIONS} value={sort} onChange={handleSortChange} />
      </div>

      <div className="mt-6 space-y-4">
        <ResourceGrid
          resources={filteredResources}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          emptyTitle="No bookmarks yet"
          emptyDescription="Save datasets, papers, and tools to find them here later."
          showBookmarkAction
        />

        {data ? (
          <Pagination page={page} limit={data.meta.limit ?? limit} total={data.meta.total ?? 0} onPageChange={setPage} />
        ) : null}
      </div>
    </PageContainer>
  );
}
