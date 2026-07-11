import type { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service';
import { AuthService } from '../services/auth.service';
import { BadgeService } from '../services/badge.service';
import { FollowService } from '../services/follow.service';
import { MessagingService } from '../services/messaging.service';
import { PinnedResourceService } from '../services/pinned-resource.service';
import { ReputationService } from '../services/reputation.service';
import { UserAnalyticsService } from '../services/user-analytics.service';
import { UserSearchService } from '../services/user-search.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  AddBookmarkInput,
  HeatmapQuery,
  ListSubmissionsQuery,
  PinResourceInput,
  ReorderPinnedResourcesInput,
  SearchUsersQuery,
  UpdateNotificationPreferenceInput,
  UpdateProfileInput,
} from '../validators/user.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', `Missing or invalid route parameter: ${name}`);
  }
  return value;
}

async function isAdminViewer(req: Request): Promise<boolean> {
  if (!req.user) return false;
  const permissions = await AuthService.getUserPermissions(req.user.userId);
  return permissions.has('user:manage') || permissions.has('profile:moderate');
}

export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  const viewerId = req.user?.userId ?? null;
  const viewerIsAdmin = await isAdminViewer(req);
  const profile = await UserService.getPublicProfile(requireParam(req, 'username'), viewerId, viewerIsAdmin);
  sendSuccess(res, profile);
}

export async function getOwnProfile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const profile = await UserService.getOwnProfile(user.userId);
  sendSuccess(res, profile);
}

export async function updateOwnProfile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateProfileInput;
  const profile = await UserService.updateProfile(user.userId, body);
  sendSuccess(res, profile);
}

export async function updateNotificationPreference(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateNotificationPreferenceInput;
  const result = await UserService.updateNotificationPreference(user.userId, body.category, body.enabled);
  sendSuccess(res, result);
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }

  const result = await UserService.uploadAvatar(user.userId, req.file);
  sendSuccess(res, result);
}

export async function uploadCoverImage(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }

  const result = await UserService.uploadCoverImage(user.userId, req.file);
  sendSuccess(res, result);
}

export async function removeCoverImage(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await UserService.removeCoverImage(user.userId);
  sendSuccess(res, { message: 'Cover image removed.' });
}

export async function getMyBookmarks(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const pagination = parsePagination(req.query as Record<string, string>);
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const result = await UserService.listBookmarks(user.userId, pagination, sort);
  sendSuccess(res, result.data, result.meta);
}

export async function addMyBookmark(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as AddBookmarkInput;
  await UserService.addBookmark(user.userId, body.resource_id);
  sendSuccess(res, { message: 'Bookmark added.' }, undefined, 201);
}

export async function removeMyBookmark(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await UserService.removeBookmark(user.userId, requireParam(req, 'resourceId'));
  sendSuccess(res, { message: 'Bookmark removed.' });
}

export async function getMySubmissions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const query = (req.validatedQuery ?? {}) as ListSubmissionsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await UserService.listSubmissions(user.userId, query.status, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const dashboard = await UserService.getDashboard(user.userId);
  sendSuccess(res, dashboard);
}

export async function getReputation(req: Request, res: Response): Promise<void> {
  const username = requireParam(req, 'username');
  const summary = await ReputationService.getUserReputationSummaryByUsername(username);
  sendSuccess(res, summary);
}

// --- Phase 4B — Follow ------------------------------------------------------

export async function followUser(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await FollowService.follow(user, requireParam(req, 'username'));
  sendSuccess(res, { message: 'Followed.' }, undefined, 201);
}

export async function unfollowUser(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await FollowService.unfollow(user.userId, requireParam(req, 'username'));
  sendSuccess(res, { message: 'Unfollowed.' });
}

export async function blockUser(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await MessagingService.blockUser(user.userId, requireParam(req, 'username'));
  sendSuccess(res, { message: 'Blocked.' }, undefined, 201);
}

export async function unblockUser(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await MessagingService.unblockUser(user.userId, requireParam(req, 'username'));
  sendSuccess(res, { message: 'Unblocked.' });
}

export async function listFollowers(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await FollowService.listFollowers(requireParam(req, 'username'), pagination, req.user?.userId ?? null);
  sendSuccess(res, result.data, result.meta);
}

export async function listFollowing(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await FollowService.listFollowing(requireParam(req, 'username'), pagination, req.user?.userId ?? null);
  sendSuccess(res, result.data, result.meta);
}

// --- Phase 4B — Activity & badges -------------------------------------------

export async function listActivity(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, string>);
  const viewerIsAdmin = await isAdminViewer(req);
  const result = await ActivityService.list(
    requireParam(req, 'username'),
    pagination,
    req.user?.userId ?? null,
    viewerIsAdmin,
  );
  sendSuccess(res, result.data, result.meta);
}

export async function getHeatmap(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as HeatmapQuery;
  const year = query.year ?? new Date().getUTCFullYear();
  const viewerIsAdmin = await isAdminViewer(req);
  const heatmap = await ActivityService.heatmap(
    requireParam(req, 'username'),
    year,
    req.user?.userId ?? null,
    viewerIsAdmin,
  );
  sendSuccess(res, heatmap);
}

export async function listUserBadges(req: Request, res: Response): Promise<void> {
  const viewerIsAdmin = await isAdminViewer(req);
  const badges = await BadgeService.listForUser(requireParam(req, 'username'), req.user?.userId ?? null, viewerIsAdmin);
  sendSuccess(res, badges);
}

// --- Phase 4B — Pinned resources ---------------------------------------------

export async function listPinnedResources(req: Request, res: Response): Promise<void> {
  const resources = await PinnedResourceService.list(requireParam(req, 'username'));
  sendSuccess(res, resources);
}

export async function listMyPinnedResources(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const resources = await PinnedResourceService.listOwn(user.userId);
  sendSuccess(res, resources);
}

export async function pinResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as PinResourceInput;
  await PinnedResourceService.pin(user.userId, body.resource_id);
  sendSuccess(res, { message: 'Resource pinned.' }, undefined, 201);
}

export async function unpinResource(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await PinnedResourceService.unpin(user.userId, requireParam(req, 'resourceId'));
  sendSuccess(res, { message: 'Resource unpinned.' });
}

export async function reorderPinnedResources(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as ReorderPinnedResourcesInput;
  await PinnedResourceService.reorder(user.userId, body.resource_ids);
  sendSuccess(res, { message: 'Pinned resources reordered.' });
}

// --- Phase 4B — Profile analytics (fire-and-forget) --------------------------

export async function recordProfileView(req: Request, res: Response): Promise<void> {
  const username = requireParam(req, 'username');
  const target = await UserService.resolveIdByUsername(username);
  void UserAnalyticsService.recordProfileView(target, req.user?.userId ?? null);
  sendSuccess(res, { message: 'Recorded.' });
}

export async function recordProfileShare(req: Request, res: Response): Promise<void> {
  const username = requireParam(req, 'username');
  const target = await UserService.resolveIdByUsername(username);
  void UserAnalyticsService.recordShare(target, req.user?.userId ?? null);
  sendSuccess(res, { message: 'Recorded.' });
}

export async function recordSocialLinkClick(req: Request, res: Response): Promise<void> {
  const username = requireParam(req, 'username');
  const target = await UserService.resolveIdByUsername(username);
  void UserAnalyticsService.recordSocialLinkClick(target, req.user?.userId ?? null);
  sendSuccess(res, { message: 'Recorded.' });
}

// --- Phase 4B — User search --------------------------------------------------

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as SearchUsersQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await UserSearchService.search(
    {
      q: query.q ?? '',
      verified: query.verified === 'true',
      contributor_level: query.contributor_level,
      skills: query.skills,
      research_interest: query.research_interest,
    },
    pagination,
  );
  sendSuccess(res, result.data, result.meta);
}
