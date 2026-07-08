'use client';

import { Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SortDropdown } from '@/components/resource/SortDropdown';
import { useCategories } from '@/lib/hooks/useCategories';
import type { ResourceSort, ResourceType } from '@/types/resource';

export type ModerationTab = 'pending' | 'approved' | 'rejected' | 'featured' | 'deleted';

const TABS: { value: ModerationTab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'featured', label: 'Featured' },
  { value: 'deleted', label: 'Deleted' },
];

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'paper', label: 'Paper' },
  { value: 'tool', label: 'Tool' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'project', label: 'Project' },
  { value: 'news', label: 'News' },
];

const SORT_OPTIONS: { value: ResourceSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'downloads', label: 'Most downloaded' },
  { value: 'bookmarks', label: 'Most bookmarked' },
];

interface ModerationFiltersProps {
  tab: ModerationTab;
  onTabChange: (tab: ModerationTab) => void;
  type: string | undefined;
  onTypeChange: (type: string | undefined) => void;
  category: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function ModerationFilters({
  tab,
  onTabChange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
}: ModerationFiltersProps) {
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(value) => onTabChange(value as ModerationTab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative flex-1 sm:min-w-56">
          <Label htmlFor="moderation-search" className="sr-only">
            Search within this page
          </Label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="moderation-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title or description on this page…"
            className="pl-9"
          />
        </div>

        <div className="w-full space-y-1.5 sm:w-40">
          <Label htmlFor="moderation-type">Type</Label>
          <FilterSelect
            id="moderation-type"
            value={type ?? ''}
            onChange={(event) => onTypeChange(event.target.value || undefined)}
          >
            <option value="">All types</option>
            {RESOURCE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>

        <div className="w-full space-y-1.5 sm:w-48">
          <Label htmlFor="moderation-category">Category</Label>
          <FilterSelect
            id="moderation-category"
            value={category ?? ''}
            onChange={(event) => onCategoryChange(event.target.value || undefined)}
          >
            <option value="">All categories</option>
            {(categories ?? []).map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </FilterSelect>
        </div>

        <SortDropdown options={SORT_OPTIONS} value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
}
