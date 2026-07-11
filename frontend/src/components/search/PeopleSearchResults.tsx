'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { UserAvatar } from '@/components/user/UserAvatar';
import { searchUsers } from '@/lib/api/users';
import { ROUTES } from '@/lib/constants/routes';

interface UserSearchHit {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  institution: string | null;
  is_verified: boolean;
  contributor_level: string;
}

interface PeopleSearchResultsProps {
  query: string;
}

// Part 12 — user search (username/display name/organization/skills/research
// interest/verified/contributor level/badges), proxied through MeiliSearch's
// second index (see backend/src/services/user-search.service.ts).
export function PeopleSearchResults({ query }: PeopleSearchResultsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers({ q: query, limit: 20 }),
    enabled: query.trim().length > 0,
  });

  const people = (data?.data ?? []) as UserSearchHit[];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Searching…</p>;
  }

  if (people.length === 0) {
    return <EmptyResults title="No people found" description="Try a different name, skill, or organization." />;
  }

  return (
    <div className="divide-y divide-border">
      {people.map((person) => (
        <Link
          key={person.id}
          href={ROUTES.userProfile(person.username)}
          className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2"
        >
          <UserAvatar avatarUrl={person.avatar_url} name={person.display_name ?? person.username} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium">
              {person.display_name ?? person.username}
              {person.is_verified ? <BadgeCheck className="size-3.5 text-brand" aria-label="Verified" /> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{person.username}
              {person.headline ? ` · ${person.headline}` : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
