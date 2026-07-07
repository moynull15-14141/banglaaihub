'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveContributorApplicationAdmin,
  approveResourceAdmin,
  deleteUserAdmin,
  featureResourceAdmin,
  getAdminDashboard,
  getContributorApplicationAdmin,
  listAuditLogsAdmin,
  listContributorApplicationsAdmin,
  listPendingResourcesAdmin,
  listUsersAdmin,
  rejectContributorApplicationAdmin,
  rejectResourceAdmin,
  requestContributorApplicationRevisionAdmin,
  restoreResourceAdmin,
  unfeatureResourceAdmin,
  updateUserRolesAdmin,
  updateUserStatusAdmin,
  type ListContributorApplicationsParams,
  type ListUsersParams,
} from '@/lib/api/admin';
import type { ListResourcesParams } from '@/types/resource';
import type { ContributorApplicationDecisionInput } from '@/types/contributor-application';

const ADMIN_PENDING_KEY = ['admin', 'resources', 'pending'] as const;
const ADMIN_DASHBOARD_KEY = ['admin', 'dashboard'] as const;
const ADMIN_CONTRIBUTOR_APPLICATIONS_KEY = ['admin', 'contributor-applications'] as const;
const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useAdminDashboard() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEY,
    queryFn: getAdminDashboard,
  });
}

export function useAdminPendingResources(params: ListResourcesParams = {}) {
  return useQuery({
    queryKey: [...ADMIN_PENDING_KEY, params],
    queryFn: () => listPendingResourcesAdmin(params),
  });
}

export function useAdminRecentUsers(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'users', 'recent', limit],
    queryFn: () => listUsersAdmin({ sort: 'newest', limit }),
  });
}

export function useAdminActivityFeed(limit = 8) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', limit],
    queryFn: () => listAuditLogsAdmin({ sort: 'newest', limit }),
  });
}

// Every resource-moderation mutation below changes counts/rows surfaced by
// both the moderation queue and the dashboard overview, so all four
// invalidate the same two query-key prefixes.
function useModerationMutation(mutationFn: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_KEY });
    },
  });
}

export function useApproveResource() {
  return useModerationMutation(approveResourceAdmin);
}

export function useRejectResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectResourceAdmin(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_KEY });
    },
  });
}

export function useFeatureResource() {
  return useModerationMutation(featureResourceAdmin);
}

export function useUnfeatureResource() {
  return useModerationMutation(unfeatureResourceAdmin);
}

export function useRestoreResource() {
  return useModerationMutation(restoreResourceAdmin);
}

export function useAdminContributorApplications(
  params: ListContributorApplicationsParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [...ADMIN_CONTRIBUTOR_APPLICATIONS_KEY, params],
    queryFn: () => listContributorApplicationsAdmin(params),
    enabled,
  });
}

export function useAdminContributorApplication(id: string) {
  return useQuery({
    queryKey: [...ADMIN_CONTRIBUTOR_APPLICATIONS_KEY, id],
    queryFn: () => getContributorApplicationAdmin(id),
    enabled: Boolean(id),
  });
}

// Every decision mutation below changes the queue, the detail record, and the
// dashboard's pending count, so all three invalidate the same key prefixes.
function useContributorApplicationDecisionMutation(
  mutationFn: (id: string, input: ContributorApplicationDecisionInput) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: ContributorApplicationDecisionInput }) =>
      mutationFn(id, input ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CONTRIBUTOR_APPLICATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_KEY });
    },
  });
}

export function useApproveContributorApplication() {
  return useContributorApplicationDecisionMutation(approveContributorApplicationAdmin);
}

export function useRejectContributorApplication() {
  return useContributorApplicationDecisionMutation(rejectContributorApplicationAdmin);
}

export function useRequestContributorApplicationRevision() {
  return useContributorApplicationDecisionMutation(requestContributorApplicationRevisionAdmin);
}

export function useAdminUsersList(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, 'list', params],
    queryFn: () => listUsersAdmin(params),
  });
}

// Role/status/delete all change what the users list and the dashboard's
// "recent users" widget show, so every mutation below invalidates both
// prefixes (ADMIN_USERS_KEY also covers useAdminRecentUsers's query key).
function useUserMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_KEY });
    },
  });
}

export function useUpdateUserRoles() {
  return useUserMutation(({ id, roleNames }: { id: string; roleNames: string[] }) =>
    updateUserRolesAdmin(id, roleNames),
  );
}

export function useUpdateUserStatus() {
  return useUserMutation(
    ({ id, status }: { id: string; status: 'active' | 'suspended' | 'banned' }) =>
      updateUserStatusAdmin(id, status),
  );
}

export function useDeleteUser() {
  return useUserMutation((id: string) => deleteUserAdmin(id));
}
