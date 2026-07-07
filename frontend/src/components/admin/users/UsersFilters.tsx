'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterSelect } from '@/components/common/FilterSelect';
import { SortDropdown } from '@/components/resource/SortDropdown';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

interface UsersFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string | undefined;
  onStatusChange: (value: string | undefined) => void;
  sort: string;
  onSortChange: (value: string) => void;
}

export function UsersFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}: UsersFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="relative flex-1 sm:min-w-56">
        <Label htmlFor="users-search" className="sr-only">
          Search by name, username, or email
        </Label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="users-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, username, or email…"
          className="pl-9"
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-40">
        <Label htmlFor="users-status">Status</Label>
        <FilterSelect
          id="users-status"
          value={status ?? ''}
          onChange={(event) => onStatusChange(event.target.value || undefined)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      <SortDropdown options={SORT_OPTIONS} value={sort} onChange={onSortChange} />
    </div>
  );
}
