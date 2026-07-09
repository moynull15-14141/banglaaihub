'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchSuggestions } from '@/lib/hooks/useSearch';
import { resourceHref } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';
import type { SearchSuggestion } from '@/types/search';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (query: string) => void;
  onDebouncedChange?: (query: string) => void;
  inputClassName?: string;
  // Part 1 (Global Search) — an autocomplete dropdown of matching resources.
  // Opt-in per call site; every current call site enables it.
  showSuggestions?: boolean;
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search datasets, papers, tools…',
  autoFocus = false,
  onSubmit,
  onDebouncedChange,
  inputClassName,
  showSuggestions = false,
}: SearchBarProps) {
  const router = useRouter();
  const listboxId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 400);

  const { data: suggestionsData } = useSearchSuggestions(showSuggestions ? debouncedValue : '');
  const suggestions = showSuggestions ? (suggestionsData ?? []) : [];
  const showDropdown = showSuggestions && open && suggestions.length > 0;

  useEffect(() => {
    onDebouncedChange?.(debouncedValue);
    // onDebouncedChange is expected to be stable (or memoized) by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  // Resyncs the input when the caller changes defaultValue programmatically
  // (e.g. SearchView clicking a recent/popular search chip) — a no-op the
  // rest of the time, since debounced typing round-trips back to the same
  // string once the caller's own state settles.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedValue]);

  function selectSuggestion(suggestion: SearchSuggestion) {
    setOpen(false);
    router.push(resourceHref(suggestion.type, suggestion.slug));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        onSubmit(value);
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn('pl-9', inputClassName)}
        aria-label="Search"
        role={showSuggestions ? 'combobox' : undefined}
        aria-expanded={showSuggestions ? showDropdown : undefined}
        aria-controls={showSuggestions ? listboxId : undefined}
        aria-autocomplete={showSuggestions ? 'list' : undefined}
        aria-activedescendant={
          showDropdown && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
      />
      {showDropdown ? (
        <SearchSuggestions
          id={listboxId}
          suggestions={suggestions}
          activeIndex={activeIndex}
          onHover={setActiveIndex}
          onSelect={selectSuggestion}
        />
      ) : null}
    </form>
  );
}
