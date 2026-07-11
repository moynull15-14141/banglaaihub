import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FilterSelect } from '@/components/common/FilterSelect';
import { useCategories } from '@/lib/hooks/useCategories';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useLicenseFacets } from '@/lib/hooks/useSearch';
import type { ResourceLanguage, ResourceType } from '@/types/resource';

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'paper', label: 'Paper' },
  { value: 'tool', label: 'Tool' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'project', label: 'Project' },
  { value: 'news', label: 'News' },
  { value: 'model', label: 'Model' },
];

const LANGUAGES: { value: ResourceLanguage; label: string }[] = [
  { value: 'bn', label: 'Bangla' },
  { value: 'en', label: 'English' },
  { value: 'both', label: 'Both' },
];

interface FilterSidebarProps {
  showTypeFilter?: boolean;
  type?: string;
  onTypeChange?: (value: string | undefined) => void;
  // CategoryView fixes the category via its route, so it hides this select
  // instead of offering a second, conflicting way to change it.
  showCategoryFilter?: boolean;
  category?: string;
  onCategoryChange?: (value: string | undefined) => void;
  language?: string;
  onLanguageChange: (value: string | undefined) => void;
  // Phase 3B — all optional so existing callers (that haven't been upgraded
  // to the shared browse hook yet) keep working unchanged.
  license?: string;
  onLicenseChange?: (value: string | undefined) => void;
  author?: string;
  onAuthorChange?: (value: string | undefined) => void;
  verified?: boolean;
  onVerifiedChange?: (value: boolean) => void;
  tags?: string[];
  onTagsChange?: (value: string[] | undefined) => void;
  onClear: () => void;
  // Off when rendered inside the mobile filter Sheet, which already has its
  // own SheetTitle — showing both reads as a duplicated "Filters" heading.
  showHeading?: boolean;
}

export function FilterSidebar({
  showTypeFilter = false,
  type,
  onTypeChange,
  showCategoryFilter = true,
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  license,
  onLicenseChange,
  author,
  onAuthorChange,
  verified,
  onVerifiedChange,
  tags,
  onTagsChange,
  onClear,
  showHeading = true,
}: FilterSidebarProps) {
  const { data: categories } = useCategories();
  const { data: licenses } = useLicenseFacets();

  const [authorText, setAuthorText] = useState(author ?? '');
  const debouncedAuthor = useDebounce(authorText, 400);
  useEffect(() => {
    if (onAuthorChange && debouncedAuthor !== (author ?? '')) {
      onAuthorChange(debouncedAuthor || undefined);
    }
    // author is the external (URL) value; only debouncedAuthor should drive updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAuthor]);
  useEffect(() => {
    setAuthorText(author ?? '');
  }, [author]);

  const [tagsText, setTagsText] = useState((tags ?? []).join(', '));
  const debouncedTags = useDebounce(tagsText, 400);
  useEffect(() => {
    if (onTagsChange) {
      const parsed = debouncedTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      const current = (tags ?? []).join(',');
      if (parsed.join(',') !== current) {
        onTagsChange(parsed.length > 0 ? parsed : undefined);
      }
    }
    // tags is the external (URL) value; only debouncedTags should drive updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTags]);
  useEffect(() => {
    setTagsText((tags ?? []).join(', '));
  }, [tags]);

  return (
    <aside className="space-y-5" aria-label="Filters">
      {showHeading ? (
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <SlidersHorizontal className="size-4 text-brand" aria-hidden="true" />
          Filters
        </div>
      ) : null}

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

      {showCategoryFilter && onCategoryChange ? (
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
      ) : null}

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

      {onLicenseChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="filter-license">License</Label>
          <FilterSelect
            id="filter-license"
            value={license ?? ''}
            onChange={(event) => onLicenseChange(event.target.value || undefined)}
          >
            <option value="">All licenses</option>
            {(licenses ?? []).map((option) => (
              <option key={option.license} value={option.license}>
                {option.license} ({option.count})
              </option>
            ))}
          </FilterSelect>
        </div>
      ) : null}

      {onAuthorChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="filter-author">Author</Label>
          <Input
            id="filter-author"
            value={authorText}
            onChange={(event) => setAuthorText(event.target.value)}
            placeholder="Username or name"
          />
        </div>
      ) : null}

      {onVerifiedChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="filter-verified">Verified authors</Label>
          <FilterSelect
            id="filter-verified"
            value={verified ? 'true' : ''}
            onChange={(event) => onVerifiedChange(event.target.value === 'true')}
          >
            <option value="">Any author</option>
            <option value="true">Verified authors only</option>
          </FilterSelect>
        </div>
      ) : null}

      {onTagsChange ? (
        <div className="space-y-1.5">
          <Label htmlFor="filter-tags">Tags</Label>
          <Input
            id="filter-tags"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="e.g. bangla, llm"
            aria-describedby="filter-tags-hint"
          />
          <p id="filter-tags-hint" className="text-xs text-muted-foreground">
            Comma-separated
          </p>
        </div>
      ) : null}

      <Separator />

      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        Clear filters
      </Button>
    </aside>
  );
}
