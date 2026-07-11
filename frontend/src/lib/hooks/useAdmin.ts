'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveContributorApplicationAdmin,
  approveResourceAdmin,
  deleteUserAdmin,
  featureResourceAdmin,
  getAdminDashboard,
  getAutoApprovalSettingAdmin,
  getContributorApplicationAdmin,
  getSearchAnalyticsAdmin,
  listAuditLogsAdmin,
  listContributorApplicationsAdmin,
  listPendingResourcesAdmin,
  listReportsAdmin,
  listUsersAdmin,
  rejectContributorApplicationAdmin,
  rejectReportAdmin,
  rejectResourceAdmin,
  removeFollowAdmin,
  requestContributorApplicationRevisionAdmin,
  resetUserCoverImageAdmin,
  resolveReportAdmin,
  restoreResourceAdmin,
  unfeatureResourceAdmin,
  unverifyUserAdmin,
  updateAutoApprovalSettingAdmin,
  updateUserRolesAdmin,
  updateUserStatusAdmin,
  verifyUserAdmin,
  type ListContributorApplicationsParams,
  type ListUsersParams,
} from '@/lib/api/admin';
import type { ListResourcesParams } from '@/types/resource';
import type { ContributorApplicationDecisionInput } from '@/types/contributor-application';
import type { ListReportsParams } from '@/types/report';

const ADMIN_PENDING_KEY = ['admin', 'resources', 'pending'] as const;
const ADMIN_DASHBOARD_KEY = ['admin', 'dashboard'] as const;
const ADMIN_CONTRIBUTOR_APPLICATIONS_KEY = ['admin', 'contributor-applications'] as const;
const ADMIN_USERS_KEY = ['admin', 'users'] as const;
const ADMIN_REPORTS_KEY = ['admin', 'reports'] as const;

export function useAdminReports(params: ListReportsParams = {}) {
  return useQuery({
    queryKey: [...ADMIN_REPORTS_KEY, params],
    queryFn: () => listReportsAdmin(params),
  });
}

function useInvalidateAdminReports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY });
  };
}

export function useResolveReport() {
  const invalidate = useInvalidateAdminReports();
  return useMutation({
    mutationFn: resolveReportAdmin,
    onSuccess: invalidate,
  });
}

export function useRejectReport() {
  const invalidate = useInvalidateAdminReports();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectReportAdmin(id, reason),
    onSuccess: invalidate,
  });
}

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

export function useAdminSearchAnalytics() {
  return useQuery({
    queryKey: ['admin', 'search-analytics'],
    queryFn: getSearchAnalyticsAdmin,
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

const ADMIN_AUTO_APPROVAL_KEY = ['admin', 'settings', 'auto-approval'] as const;

export function useAutoApprovalSetting() {
  return useQuery({
    queryKey: ADMIN_AUTO_APPROVAL_KEY,
    queryFn: getAutoApprovalSettingAdmin,
  });
}

// Optimistic, same shape as the notification-preference toggle in
// useProfile.ts — a moderation-queue-wide switch must flip instantly on
// click, then roll back to the pre-toggle value if the request fails.
export function useUpdateAutoApprovalSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAutoApprovalSettingAdmin,
    onMutate: async (requireManualApproval) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_AUTO_APPROVAL_KEY });
      const previous = queryClient.getQueryData(ADMIN_AUTO_APPROVAL_KEY);
      queryClient.setQueryData(ADMIN_AUTO_APPROVAL_KEY, { require_manual_approval: requireManualApproval });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ADMIN_AUTO_APPROVAL_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_AUTO_APPROVAL_KEY });
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

// --- Phase 4B — profile moderation -------------------------------------------

export function useVerifyUser() {
  return useUserMutation((id: string) => verifyUserAdmin(id));
}

export function useUnverifyUser() {
  return useUserMutation((id: string) => unverifyUserAdmin(id));
}

export function useResetUserCoverImage() {
  return useUserMutation((id: string) => resetUserCoverImageAdmin(id));
}

export function useRemoveFollowAdmin() {
  return useMutation({ mutationFn: (followId: string) => removeFollowAdmin(followId) });
}
