import { Ban, BadgeCheck, MoreHorizontal, Pencil, RotateCcw, ShieldOff, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ROLE_LABELS } from '@/lib/constants/roles';
import { formatDate } from '@/lib/utils/format';
import type { AdminUser } from '@/types/admin';

const STATUS_VARIANT: Record<AdminUser['status'], 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  suspended: 'warning',
  banned: 'destructive',
};

export interface UserRowActions {
  onEditRoles: (user: AdminUser) => void;
  onChangeStatus: (user: AdminUser, status: 'active' | 'suspended' | 'banned') => void;
  onDelete: (user: AdminUser) => void;
  onToggleVerified: (user: AdminUser) => void;
}

function RoleBadges({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} variant="outline">
          {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
        </Badge>
      ))}
    </div>
  );
}

function RowActionsMenu({
  user,
  onEditRoles,
  onChangeStatus,
  onDelete,
  onToggleVerified,
}: UserRowActions & { user: AdminUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.username}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditRoles(user)}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit roles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleVerified(user)}>
          <BadgeCheck className="size-4" aria-hidden="true" />
          {user.is_verified ? 'Unverify' : 'Verify'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.status !== 'active' ? (
          <DropdownMenuItem onClick={() => onChangeStatus(user, 'active')}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reactivate
          </DropdownMenuItem>
        ) : null}
        {user.status !== 'suspended' ? (
          <DropdownMenuItem onClick={() => onChangeStatus(user, 'suspended')}>
            <ShieldOff className="size-4" aria-hidden="true" />
            Suspend
          </DropdownMenuItem>
        ) : null}
        {user.status !== 'banned' ? (
          <DropdownMenuItem onClick={() => onChangeStatus(user, 'banned')} variant="destructive">
            <Ban className="size-4" aria-hidden="true" />
            Ban
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(user)} variant="destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface UsersTableProps extends UserRowActions {
  users: AdminUser[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function UsersTable({ users, isLoading, isError, onRetry, ...actions }: UsersTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load users"
        description="Something went wrong while fetching the user list."
        onRetry={onRetry}
      />
    );
  }

  if (!users || users.length === 0) {
    return <EmptyState icon={Users} title="No users found" description="No users match the current filters." />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-xs text-muted-foreground backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                User
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Roles
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Joined
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar avatarUrl={user.avatar_url} name={user.display_name ?? user.username} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate font-medium">
                        {user.display_name ?? user.username}
                        {user.is_verified ? (
                          <BadgeCheck className="size-3.5 shrink-0 text-brand" aria-label="Verified" />
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.username} · {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-64 px-4 py-3">
                  <RoleBadges roles={user.roles} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[user.status]} className="capitalize">
                    {user.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActionsMenu user={user} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserAvatar avatarUrl={user.avatar_url} name={user.display_name ?? user.username} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.display_name ?? user.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <RowActionsMenu user={user} {...actions} />
              </div>
              <RoleBadges roles={user.roles} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Badge variant={STATUS_VARIANT[user.status]} className="capitalize">
                  {user.status}
                </Badge>
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
