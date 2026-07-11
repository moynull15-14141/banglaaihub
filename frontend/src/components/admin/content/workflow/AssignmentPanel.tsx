'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { searchUsers } from '@/lib/api/users';
import { useArticleAssignments, useAssignArticle, useUnassignArticle } from '@/lib/hooks/useArticleAssignment';
import type { AssignmentRole } from '@/lib/api/articleWorkflow';

const ROLE_SLOTS: { role: AssignmentRole; label: string }[] = [
  { role: 'writer', label: 'Writer' },
  { role: 'reviewer', label: 'Reviewer' },
  { role: 'seo_reviewer', label: 'SEO Reviewer' },
  { role: 'publisher', label: 'Publisher' },
];

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function AssigneePicker({ onSelect }: { onSelect: (userId: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['assignee-picker', debouncedQuery],
    queryFn: () => searchUsers({ q: debouncedQuery, limit: 8 }),
    enabled: open && debouncedQuery.trim().length > 1,
  });

  const results =
    (data?.data as
      | { id: string; username: string; display_name: string | null; avatar_url: string | null }[]
      | undefined) ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Assign someone">
          <UserPlus className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people…" />
        <div className="mt-2 max-h-48 overflow-y-auto">
          {isFetching ? (
            <div className="flex justify-center py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {debouncedQuery.trim() ? 'No matches.' : 'Type to search.'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {results.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(person.id, person.display_name ?? person.username);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <UserAvatar
                      avatarUrl={person.avatar_url}
                      name={person.display_name ?? person.username}
                      className="size-6 shrink-0"
                    />
                    <span className="truncate">{person.display_name ?? person.username}</span>
                    <span className="truncate text-xs text-muted-foreground">@{person.username}</span>
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

interface AssignmentPanelProps {
  slug: string;
}

export function AssignmentPanel({ slug }: AssignmentPanelProps) {
  const { data: assignments } = useArticleAssignments(slug);
  const assignMutation = useAssignArticle(slug);
  const unassignMutation = useUnassignArticle(slug);

  const byRole = new Map((assignments ?? []).map((a) => [a.role, a]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
        <CardDescription>Who owns each stage of this article.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ROLE_SLOTS.map(({ role, label }) => {
          const assignment = byRole.get(role);
          return (
            <div key={role} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {assignment ? (
                  <div className="mt-1 flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={assignment.assigned_to.avatar_url}
                      name={assignment.assigned_to.display_name ?? assignment.assigned_to.username}
                      className="size-6"
                    />
                    <span className="truncate text-sm font-medium">
                      {assignment.assigned_to.display_name ?? assignment.assigned_to.username}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Unassigned</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {assignment ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${label} assignment`}
                    loading={unassignMutation.isPending}
                    onClick={() =>
                      unassignMutation.mutate(role, {
                        onSuccess: () => toast.success('Assignment removed.'),
                        onError: (error) => toast.error(errorMessage(error, 'Could not remove this assignment.')),
                      })
                    }
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                ) : null}
                <AssigneePicker
                  onSelect={(userId, label2) =>
                    assignMutation.mutate(
                      { role, assigned_to_id: userId },
                      {
                        onSuccess: () => toast.success(`${label2} assigned as ${label}.`),
                        onError: (error) => toast.error(errorMessage(error, 'Could not assign this person.')),
                      },
                    )
                  }
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
