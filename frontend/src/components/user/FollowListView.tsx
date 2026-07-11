'use client';

import Link from 'next/link';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/common/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { SectionHeader } from '@/components/common/SectionHeader';
import { UserAvatar } from '@/components/user/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { useFollowers, useFollowing } from '@/lib/hooks/useFollows';
import { usePagination } from '@/lib/hooks/usePagination';
import { ROUTES } from '@/lib/constants/routes';

interface FollowListViewProps {
  username: string;
  mode: 'followers' | 'following';
}

export function FollowListView({ username, mode }: FollowListViewProps) {
  const { page, limit, setPage } = usePagination({ initialLimit: 20 });
  const followersQuery = useFollowers(username, { page, limit });
  const followingQuery = useFollowing(username, { page, limit });
  const { data, isLoading, isError, error, refetch } = mode === 'followers' ? followersQuery : followingQuery;

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    return (
      <PageContainer>
        <ErrorState title="Couldn't load this list" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const users = data?.data ?? [];

  return (
    <PageContainer className="max-w-2xl">
      <SectionHeader title={mode === 'followers' ? `@${username}'s followers` : `@${username} is following`} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users.length === 0 ? (
        <EmptyState
          title={mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
        />
      ) : (
        <div className="divide-y divide-border">
          {users.map((user) => (
            <Link
              key={user.id}
              href={ROUTES.userProfile(user.username)}
              className="flex items-center gap-3 py-3 hover:bg-muted/50 rounded-lg px-2"
            >
              <UserAvatar avatarUrl={user.avatar_url} name={user.display_name ?? user.username} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.display_name ?? user.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              </div>
              {user.is_following ? <Badge variant="outline">Following</Badge> : null}
            </Link>
          ))}
        </div>
      )}

      {data ? (
        <Pagination page={page} limit={limit} total={data.meta.total ?? 0} onPageChange={setPage} />
      ) : null}
    </PageContainer>
  );
}
