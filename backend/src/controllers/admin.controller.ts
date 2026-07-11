import type { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service';
import { AdminService } from '../services/admin.service';
import { BadgeService } from '../services/badge.service';
import { ContributorApplicationService } from '../services/contributor-application.service';
import { FeedAdminService } from '../services/feed-admin.service';
import { FeedService } from '../services/feed.service';
import { FeedSettingsService } from '../services/feed-settings.service';
import { FollowService } from '../services/follow.service';
import { PlatformSettingsService } from '../services/platform-settings.service';
import { ReportService } from '../services/report.service';
import { ResourceService } from '../services/resources.service';
import { SearchService } from '../services/search.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  CreateBadgeInput,
  GrantBadgeInput,
  ListAuditLogsQuery,
  ListReportsQuery,
  ListUsersQuery,
  RejectReportInput,
  RejectResourceInput,
  UpdateAutoApprovalSettingInput,
  UpdateBadgeInput,
  UpdateReportStatusInput,
  UpdateUserRolesInput,
  UpdateUserStatusInput,
} from '../validators/admin.validator';
import type {
  CreateFeedAnnouncementInput,
  CreateFeedPinInput,
  PreviewFeedInput,
  UpdateFeedAnnouncementInput,
  UpdateFeedConfigInput,
  UpdateFeedPinInput,
} from '../validators/feed.validator';
import type { UpdateProfileInput } from '../validators/user.validator';
import type { ListResourcesQuery } from '../validators/resource.validator';
import type {
  ContributorApplicationDecisionInput,
  ListContributorApplicationsQuery,
} from '../validators/contributor-application.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

// Same shape as auth.controller.ts's requestContext() — passed through to
// writeAuditLog() call sites so the ip/user-agent columns are populated
// consistently with every other audited action.
function requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', `Missing or invalid route parameter: ${name}`);
  }
  return value;
}

// --- Resource moderation ------------------------------------------------------

export async function getAutoApprovalSetting(_req: Request, res: Response): Promise<void> {
  const requireManualApproval = await PlatformSettingsService.getRequireManualApproval();
  sendSuccess(res, { require_manual_approval: requireManualApproval });
}

export async function updateAutoApprovalSetting(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateAutoApprovalSettingInput;
  const requireManualApproval = await PlatformSettingsService.setRequireManualApproval(
    body.require_manual_approval,
    user.userId,
  );
  sendSuccess(res, { require_manual_approval: requireManualApproval });
}

export async function listPendingResources(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListResourcesQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  // Defaults to 'pending' (this endpoint's original, sole behavior) when no
  // status is specified — additive only, existing callers are unaffected.
  const result = await ResourceService.list(
    { ...query, status: query.status ?? 'pending' },
    pagination,
    req.user,
  );
  sendSuccess(res, result.data, result.meta);
}

export async function approveResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.approve(requireParam(req, 'id'), user.userId);
  sendSuccess(res, resource);
}

export async function rejectResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as RejectResourceInput;
  const resource = await ResourceService.reject(requireParam(req, 'id'), user.userId, body.reason);
  sendSuccess(res, resource);
}

export async function featureResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.setFeatured(requireParam(req, 'id'), true, user.userId);
  sendSuccess(res, resource);
}

export async function unfeatureResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.setFeatured(requireParam(req, 'id'), false, user.userId);
  sendSuccess(res, resource);
}

export async function restoreResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resource = await ResourceService.restore(requireParam(req, 'id'), user.userId);
  sendSuccess(res, resource);
}

// --- User management -----------------------------------------------------------

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListUsersQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await UserService.listUsersAdmin(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await UserService.getUserByIdAdmin(requireParam(req, 'id'));
  sendSuccess(res, user);
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateProfileInput;
  const user = await UserService.updateUserAdmin(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateUserStatusInput;
  const user = await UserService.updateUserStatus(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function updateUserRoles(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateUserRolesInput;
  const user = await UserService.updateUserRoles(requireParam(req, 'id'), body, actor.userId);
  sendSuccess(res, user);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await UserService.softDeleteUser(requireParam(req, 'id'), actor.userId);
  sendSuccess(res, { message: 'User deleted.' });
}

// --- Phase 4B — profile moderation -------------------------------------------

export async function verifyUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const user = await UserService.setVerified(requireParam(req, 'id'), true, actor.userId);
  sendSuccess(res, user);
}

export async function unverifyUser(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const user = await UserService.setVerified(requireParam(req, 'id'), false, actor.userId);
  sendSuccess(res, user);
}

export async function resetUserCoverImage(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await UserService.adminResetCoverImage(requireParam(req, 'id'), actor.userId);
  sendSuccess(res, { message: 'Cover image reset.' });
}

export async function removeFollow(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await FollowService.adminRemoveFollow(requireParam(req, 'id'), actor.userId);
  sendSuccess(res, { message: 'Follow relationship removed.' });
}

export async function getUserActivity(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  // Admin viewer always bypasses profile-visibility gating.
  const user = await UserService.getUserByIdAdmin(requireParam(req, 'id'));
  const username = (user as { username: string }).username;
  const result = await ActivityService.list(username, pagination, null, true);
  sendSuccess(res, result.data, result.meta);
}

// --- Phase 4B — badges --------------------------------------------------------

export async function listBadges(_req: Request, res: Response): Promise<void> {
  const badges = await BadgeService.listCatalog();
  sendSuccess(res, badges);
}

export async function createBadge(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as CreateBadgeInput;
  const badge = await BadgeService.adminCreateBadge(body, actor.userId);
  sendSuccess(res, badge, undefined, 201);
}

export async function updateBadge(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateBadgeInput;
  const badge = await BadgeService.adminUpdateBadge(Number(requireParam(req, 'id')), body, actor.userId);
  sendSuccess(res, badge);
}

export async function deleteBadge(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await BadgeService.adminDeleteBadge(Number(requireParam(req, 'id')), actor.userId);
  sendSuccess(res, { message: 'Badge deleted.' });
}

export async function grantBadge(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as GrantBadgeInput;
  await BadgeService.adminGrant(requireParam(req, 'id'), body.badge_id, actor.userId);
  sendSuccess(res, { message: 'Badge granted.' }, undefined, 201);
}

export async function revokeBadge(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  await BadgeService.adminRevoke(requireParam(req, 'id'), Number(requireParam(req, 'badgeId')), actor.userId);
  sendSuccess(res, { message: 'Badge revoked.' });
}

// --- Reports ---------------------------------------------------------------------

export async function listReports(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListReportsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ReportService.list(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getReportById(req: Request, res: Response): Promise<void> {
  const report = await ReportService.getById(requireParam(req, 'id'));
  sendSuccess(res, report);
}

export async function updateReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as UpdateReportStatusInput;
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    body.status,
    actor.userId,
    'admin.report.update',
    body.reason,
  );
  sendSuccess(res, report);
}

export async function resolveReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    'resolved',
    actor.userId,
    'admin.report.resolve',
  );
  sendSuccess(res, report);
}

export async function rejectReport(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = req.validatedBody as RejectReportInput;
  // doc 10's Report.status enum has no literal "rejected" value — "reject" maps
  // to the existing "dismissed" status, same as Phase 5's draft/pending mapping.
  const report = await ReportService.updateStatus(
    requireParam(req, 'id'),
    'dismissed',
    actor.userId,
    'admin.report.reject',
    body.reason,
  );
  sendSuccess(res, report);
}

// --- Contributor applications ------------------------------------------------------

export async function listContributorApplications(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListContributorApplicationsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ContributorApplicationService.listForAdmin(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getContributorApplicationById(req: Request, res: Response): Promise<void> {
  const application = await ContributorApplicationService.getByIdForAdmin(requireParam(req, 'id'));
  sendSuccess(res, application);
}

export async function approveContributorApplication(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.approve(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

export async function rejectContributorApplication(req: Request, res: Response): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.reject(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

export async function requestContributorApplicationRevision(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = requireUser(req);
  const body = (req.validatedBody ?? {}) as ContributorApplicationDecisionInput;
  const application = await ContributorApplicationService.requestRevision(
    requireParam(req, 'id'),
    actor.userId,
    body,
  );
  sendSuccess(res, application);
}

// --- Audit logs -------------------------------------------------------------------

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListAuditLogsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await AdminService.listAuditLogs(query, pagination);
  sendSuccess(res, result.data, result.meta);
}

// --- Dashboard --------------------------------------------------------------------

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const stats = await AdminService.getDashboard();
  sendSuccess(res, stats);
}

// --- Feed engine config (Phase 4D) ---------------------------------------------------

export async function getFeedConfig(_req: Request, res: Response): Promise<void> {
  const config = await FeedSettingsService.getConfigDto();
  sendSuccess(res, config);
}

export async function updateFeedConfig(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = (req.validatedBody ?? {}) as UpdateFeedConfigInput;
  const config = await FeedSettingsService.updateConfig(body, user.userId, requestContext(req));
  sendSuccess(res, config);
}

// --- Live Feed Preview (Phase 4C, Stage 1) --------------------------------------------
// Read-only diagnostic: runs the real ranking engine against a draft config
// and a simulated persona, never persists anything (see FeedService.previewFeed
// and FeedAdminService.resolvePersonaUserId).

export async function previewFeedConfig(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as PreviewFeedInput;
  const current = await FeedSettingsService.getConfig();
  const configOverride = FeedSettingsService.mergeConfigPatch(current, body.config ?? {});

  const simulateUserId = await FeedAdminService.resolvePersonaUserId(body.persona);
  const result = await FeedService.previewFeed(body.mode, simulateUserId, configOverride);
  sendSuccess(res, { cards: result.data, persona: body.persona, simulated_user_id: simulateUserId });
}

export async function rollbackFeedConfig(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const config = await FeedSettingsService.rollbackToVersion(
    requireParam(req, 'auditLogId'),
    user.userId,
    requestContext(req),
  );
  sendSuccess(res, config);
}

// --- Feed pins (Phase 4D — Featured / Editor's Pick placement) -----------------------

export async function listFeedPins(_req: Request, res: Response): Promise<void> {
  const pins = await FeedAdminService.listPins();
  sendSuccess(res, pins);
}

export async function createFeedPin(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateFeedPinInput;
  const pin = await FeedAdminService.createPin(body, user.userId);
  sendSuccess(res, pin, undefined, 201);
}

export async function updateFeedPin(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as UpdateFeedPinInput;
  const pin = await FeedAdminService.updatePin(requireParam(req, 'id'), body);
  sendSuccess(res, pin);
}

export async function deleteFeedPin(req: Request, res: Response): Promise<void> {
  await FeedAdminService.deletePin(requireParam(req, 'id'));
  sendSuccess(res, { message: 'Pin removed.' });
}

// --- Feed announcements (Phase 4D) ----------------------------------------------------

export async function listFeedAnnouncements(_req: Request, res: Response): Promise<void> {
  const announcements = await FeedAdminService.listAnnouncements();
  sendSuccess(res, announcements);
}

export async function createFeedAnnouncement(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateFeedAnnouncementInput;
  const announcement = await FeedAdminService.createAnnouncement(body, user.userId);
  sendSuccess(res, announcement, undefined, 201);
}

export async function updateFeedAnnouncement(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as UpdateFeedAnnouncementInput;
  const announcement = await FeedAdminService.updateAnnouncement(requireParam(req, 'id'), body);
  sendSuccess(res, announcement);
}

export async function deleteFeedAnnouncement(req: Request, res: Response): Promise<void> {
  await FeedAdminService.deleteAnnouncement(requireParam(req, 'id'));
  sendSuccess(res, { message: 'Announcement removed.' });
}

export async function uploadFeedAnnouncementImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const announcement = await FeedAdminService.uploadAnnouncementImage(requireParam(req, 'id'), req.file);
  sendSuccess(res, announcement);
}

export async function removeFeedAnnouncementImage(req: Request, res: Response): Promise<void> {
  const announcement = await FeedAdminService.removeAnnouncementImage(requireParam(req, 'id'));
  sendSuccess(res, announcement);
}

// --- Search analytics (Phase 3B) ---------------------------------------------------

export async function getSearchAnalytics(_req: Request, res: Response): Promise<void> {
  const summary = await SearchService.getSearchAnalyticsSummary();
  sendSuccess(res, summary);
}
