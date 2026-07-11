'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageContainer } from '@/components/common/PageContainer';
import { Pagination } from '@/components/common/Pagination';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { UsersFilters, type UsersScope } from '@/components/admin/users/UsersFilters';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UserRolesDialog } from '@/components/admin/users/UserRolesDialog';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useAdminUsersList,
  useDeleteUser,
  useUnverifyUser,
  useUpdateUserRoles,
  useUpdateUserStatus,
  useVerifyUser,
} from '@/lib/hooks/useAdmin';
import type { AdminUser } from '@/types/admin';

const PAGE_SIZE = 20;

type StatusTarget = { user: AdminUser; status: 'active' | 'suspended' | 'banned' };

const STATUS_CHANGE_COPY: Record<
  StatusTarget['status'],
  {
    title: (name: string) => string;
    description: string;
    confirmLabel: string;
    variant: 'default' | 'destructive';
  }
> = {
  active: {
    title: (name) => `Reactivate ${name}?`,
    description: 'Their account will regain full access immediately.',
    confirmLabel: 'Reactivate',
    variant: 'default',
  },
  suspended: {
    title: (name) => `Suspend ${name}?`,
    description: 'They will be temporarily unable to log in until reactivated.',
    confirmLabel: 'Suspend',
    variant: 'destructive',
  },
  banned: {
    title: (name) => `Ban ${name}?`,
    description: 'They will be permanently unable to log in unless reactivated later.',
    confirmLabel: 'Ban',
    variant: 'destructive',
  },
};

export function UserManagementView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const scope = (searchParams.get('scope') as UsersScope | null) ?? 'all';
  const status = (searchParams.get('status') as AdminUser['status'] | null) ?? undefined;
  const sort = searchParams.get('sort') ?? 'newest';
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const [search, setSearch] = useState('');

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const queryParams = useMemo(
    () => ({
      search: search.trim() || undefined,
      scope,
      status,
      sort: sort as 'newest' | 'oldest',
      page,
      limit: PAGE_SIZE,
    }),
    [search, scope, status, sort, page],
  );

  const { data, isLoading, isError, refetch } = useAdminUsersList(queryParams);

  const [rolesTarget, setRolesTarget] = useState<AdminUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const rolesMutation = useUpdateUserRoles();
  const statusMutation = useUpdateUserStatus();
  const deleteMutation = useDeleteUser();
  const verifyMutation = useVerifyUser();
  const unverifyMutation = useUnverifyUser();

  function handleToggleVerified(user: AdminUser) {
    const mutation = user.is_verified ? unverifyMutation : verifyMutation;
    mutation.mutate(user.id, {
      onSuccess: () => toast.success(user.is_verified ? 'User unverified.' : 'User verified.'),
      onError: () => toast.error('Could not update verification status.'),
    });
  }

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Users</h1>
      <p className="mt-1 text-muted-foreground">Search, review, and manage user accounts.</p>

      <div className="mt-6 space-y-4">
        <UsersFilters
          scope={scope}
          onScopeChange={(value) => updateParams({ scope: value === 'all' ? undefined : value })}
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={(value) => updateParams({ status: value })}
          sort={sort}
          onSortChange={(value) => updateParams({ sort: value })}
        />

        <UsersTable
          users={data?.data}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          onEditRoles={setRolesTarget}
          onChangeStatus={(user, nextStatus) => setStatusTarget({ user, status: nextStatus })}
          onDelete={setDeleteTarget}
          onToggleVerified={handleToggleVerified}
          currentUserId={currentUser?.id}
        />

        {data ? (
          <Pagination
            page={page}
            limit={data.meta.limit ?? PAGE_SIZE}
            total={data.meta.total ?? 0}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
          />
        ) : null}
      </div>

      <UserRolesDialog
        user={rolesTarget}
        onOpenChange={(open) => {
          if (!open) setRolesTarget(null);
        }}
        isPending={rolesMutation.isPending}
        onConfirm={(roleNames) => {
          if (!rolesTarget) return;
          rolesMutation.mutate(
            { id: rolesTarget.id, roleNames },
            {
              onSuccess: () => {
                toast.success('Roles updated.');
                setRolesTarget(null);
              },
              onError: () => toast.error('Could not update roles. Please try again.'),
            },
          );
        }}
      />

      <ConfirmActionDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={
          statusTarget
            ? STATUS_CHANGE_COPY[statusTarget.status].title(
                statusTarget.user.display_name ?? statusTarget.user.username,
              )
            : ''
        }
        description={statusTarget ? STATUS_CHANGE_COPY[statusTarget.status].description : ''}
        confirmLabel={statusTarget ? STATUS_CHANGE_COPY[statusTarget.status].confirmLabel : ''}
        variant={statusTarget ? STATUS_CHANGE_COPY[statusTarget.status].variant : 'default'}
        isPending={statusMutation.isPending}
        onConfirm={() => {
          if (!statusTarget) return;
          statusMutation.mutate(
            { id: statusTarget.user.id, status: statusTarget.status },
            {
              onSuccess: () => {
                toast.success('Status updated.');
                setStatusTarget(null);
              },
              onError: () => toast.error('Could not update status. Please try again.'),
            },
          );
        }}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.display_name ?? deleteTarget?.username ?? ''}?`}
        description="This soft-deletes the account — their data is kept, but they will no longer be able to log in."
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success('User deleted.');
              setDeleteTarget(null);
            },
            onError: () => toast.error('Could not delete this user. Please try again.'),
          });
        }}
      />
    </PageContainer>
  );
}
