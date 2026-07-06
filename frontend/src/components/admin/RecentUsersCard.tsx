'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { AdminListCard } from '@/components/admin/AdminListCard';
import { useAdminRecentUsers } from '@/lib/hooks/useAdmin';
import { ROUTES } from '@/lib/constants/routes';

export function RecentUsersCard() {
  const { data, isLoading, isError, refetch } = useAdminRecentUsers(5);
  const users = data?.data ?? [];

  return (
    <AdminListCard
      title="Recent users"
      viewAllHref={ROUTES.adminUsers}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      isEmpty={users.length === 0}
      emptyLabel="No users yet."
    >
      <ul className="flex flex-col divide-y">
        {users.map((user) => (
          <li key={user.id} className="flex items-center gap-3 py-2.5">
            <UserAvatar
              avatarUrl={user.avatar_url}
              name={user.display_name ?? user.username}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={ROUTES.userProfile(user.username)}
                className="block truncate text-sm font-medium hover:underline"
              >
                {user.display_name ?? user.username}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'} className="shrink-0 capitalize">
              {user.status}
            </Badge>
          </li>
        ))}
      </ul>
    </AdminListCard>
  );
}
