import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { cn } from '@/lib/utils';
import type { SearchSuggestion } from '@/types/search';

interface SearchSuggestionsProps {
  id: string;
  suggestions: SearchSuggestion[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
}

export function SearchSuggestions({ id, suggestions, activeIndex, onHover, onSelect }: SearchSuggestionsProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border bg-popover p-1 shadow-md"
    >
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.id} role="presentation">
          <button
            type="button"
            role="option"
            id={`${id}-option-${index}`}
            aria-selected={index === activeIndex}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm',
              index === activeIndex ? 'bg-muted' : 'hover:bg-muted/60',
            )}
            onMouseEnter={() => onHover(index)}
            // mousedown (not click) so this fires before the input's blur —
            // selection would otherwise be lost when the dropdown closes.
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(suggestion);
            }}
          >
            <span className="truncate">{suggestion.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {RESOURCE_TYPE_LABELS[suggestion.type] ?? suggestion.type}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
