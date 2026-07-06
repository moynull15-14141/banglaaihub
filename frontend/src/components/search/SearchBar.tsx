'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (query: string) => void;
  onDebouncedChange?: (query: string) => void;
  inputClassName?: string;
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search datasets, papers, tools…',
  autoFocus = false,
  onSubmit,
  onDebouncedChange,
  inputClassName,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, 400);

  useEffect(() => {
    onDebouncedChange?.(debouncedValue);
    // onDebouncedChange is expected to be stable (or memoized) by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
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
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn('pl-9', inputClassName)}
        aria-label="Search"
      />
    </form>
  );
}
