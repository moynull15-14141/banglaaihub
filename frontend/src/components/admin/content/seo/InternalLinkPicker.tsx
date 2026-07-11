'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';
import { FolderTree, Link2, Loader2, Tag as TagIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getSearchSuggestions } from '@/lib/api/search';
import { listCategories } from '@/lib/api/categories';
import { listTags } from '@/lib/api/tags';
import { searchUsers } from '@/lib/api/users';
import { ROUTES, resourceHref } from '@/lib/constants/routes';

interface LinkSuggestion {
  key: string;
  label: string;
  sublabel: string;
  href: string;
  icon: typeof Link2;
}

interface InternalLinkPickerProps {
  editor: Editor | null;
}

// Reuses the existing SearchService.suggest() endpoint (already covers every
// resource type, including articles) plus the existing category/tag/user
// listing endpoints — no new backend surface for this feature at all. One-
// click insertion calls the Tiptap Link mark directly on the live editor
// instance handed up via RichTextEditor's onEditorReady.
export function InternalLinkPicker({ editor }: InternalLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: resourceSuggestions, isFetching: isFetchingResources } = useQuery({
    queryKey: ['internal-link', 'resources', debouncedQuery],
    queryFn: ({ signal }) => getSearchSuggestions(debouncedQuery, signal),
    enabled: open && debouncedQuery.trim().length > 0,
  });

  const { data: categories } = useQuery({
    queryKey: ['internal-link', 'categories'],
    queryFn: listCategories,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: tags } = useQuery({
    queryKey: ['internal-link', 'tags'],
    queryFn: listTags,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: userResults } = useQuery({
    queryKey: ['internal-link', 'users', debouncedQuery],
    queryFn: () => searchUsers({ q: debouncedQuery, limit: 5 }),
    enabled: open && debouncedQuery.trim().length > 1,
  });

  const suggestions: LinkSuggestion[] = [
    ...(resourceSuggestions ?? []).map((r) => ({
      key: `resource-${r.id}`,
      label: r.title,
      sublabel: r.type,
      href: resourceHref(r.type, r.slug),
      icon: Link2,
    })),
    ...(debouncedQuery.trim()
      ? (categories ?? [])
          .filter((c) => c.name.toLowerCase().includes(debouncedQuery.trim().toLowerCase()))
          .slice(0, 5)
          .map((c) => ({ key: `category-${c.id}`, label: c.name, sublabel: 'Category', href: ROUTES.category(c.slug), icon: FolderTree }))
      : []),
    ...(debouncedQuery.trim()
      ? (tags ?? [])
          .filter((t) => t.name.toLowerCase().includes(debouncedQuery.trim().toLowerCase()))
          .slice(0, 5)
          .map((t) => ({ key: `tag-${t.id}`, label: t.name, sublabel: 'Tag', href: ROUTES.tag(t.slug), icon: TagIcon }))
      : []),
    ...((userResults?.data as { username: string; display_name: string | null }[] | undefined) ?? []).map((u) => ({
      key: `user-${u.username}`,
      label: u.display_name ?? u.username,
      sublabel: `@${u.username}`,
      href: ROUTES.userProfile(u.username),
      icon: User,
    })),
  ];

  function insertLink(suggestion: LinkSuggestion) {
    if (!editor) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    editor
      .chain()
      .focus()
      .insertContent(`<a href="${appUrl}${suggestion.href}">${suggestion.label}</a> `)
      .run();
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={!editor}>
          <Link2 className="size-4" aria-hidden="true" />
          Insert internal link
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles, models, datasets, categories, tags, people…"
        />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {isFetchingResources ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {debouncedQuery.trim() ? 'No matches found.' : 'Start typing to search.'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {suggestions.map((suggestion) => (
                <li key={suggestion.key}>
                  <button
                    type="button"
                    onClick={() => insertLink(suggestion)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <suggestion.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{suggestion.sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
