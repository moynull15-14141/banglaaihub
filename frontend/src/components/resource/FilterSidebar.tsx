import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCategories } from '@/lib/hooks/useCategories';
import type { ResourceLanguage, ResourceType } from '@/types/resource';

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'paper', label: 'Paper' },
  { value: 'tool', label: 'Tool' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'project', label: 'Project' },
  { value: 'news', label: 'News' },
];

const LANGUAGES: { value: ResourceLanguage; label: string }[] = [
  { value: 'bn', label: 'Bangla' },
  { value: 'en', label: 'English' },
  { value: 'both', label: 'Both' },
];

const selectClassName =
  'w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 pr-8 text-sm shadow-xs transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function FilterSelect({ id, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select id={id} className={selectClassName} {...props} />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

interface FilterSidebarProps {
  showTypeFilter?: boolean;
  type?: string;
  onTypeChange?: (value: string | undefined) => void;
  category?: string;
  onCategoryChange: (value: string | undefined) => void;
  language?: string;
  onLanguageChange: (value: string | undefined) => void;
  onClear: () => void;
}

export function FilterSidebar({
  showTypeFilter = false,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  onClear,
}: FilterSidebarProps) {
  const { data: categories } = useCategories();

  return (
    <aside className="space-y-5" aria-label="Filters">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <SlidersHorizontal className="size-4 text-brand" aria-hidden="true" />
        Filters
      </div>

      {showTypeFilter && onTypeChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="filter-type">Type</Label>
          <FilterSelect
            id="filter-type"
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
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="filter-category">Category</Label>
        <FilterSelect
          id="filter-category"
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

      <div className="space-y-1.5">
        <Label htmlFor="filter-language">Language</Label>
        <FilterSelect
          id="filter-language"
          value={language ?? ''}
          onChange={(event) => onLanguageChange(event.target.value || undefined)}
        >
          <option value="">All languages</option>
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FilterSelect>
      </div>

      <Separator />

      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        Clear filters
      </Button>
    </aside>
  );
}
