import { Button } from '@/components/ui/button';
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
  'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

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
      {showTypeFilter && onTypeChange ? (
        <div className="space-y-1.5">
          <label htmlFor="filter-type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="filter-type"
            className={selectClassName}
            value={type ?? ''}
            onChange={(event) => onTypeChange(event.target.value || undefined)}
          >
            <option value="">All types</option>
            {RESOURCE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="filter-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="filter-category"
          className={selectClassName}
          value={category ?? ''}
          onChange={(event) => onCategoryChange(event.target.value || undefined)}
        >
          <option value="">All categories</option>
          {(categories ?? []).map((option) => (
            <option key={option.id} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="filter-language" className="text-sm font-medium">
          Language
        </label>
        <select
          id="filter-language"
          className={selectClassName}
          value={language ?? ''}
          onChange={(event) => onLanguageChange(event.target.value || undefined)}
        >
          <option value="">All languages</option>
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        Clear filters
      </Button>
    </aside>
  );
}
