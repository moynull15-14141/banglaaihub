import type { Request, Response } from 'express';
import { ReputationService } from '../services/reputation.service';
import { UserService } from '../services/users.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  AddBookmarkInput,
  ListSubmissionsQuery,
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

export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  const profile = await UserService.getPublicProfile(requireParam(req, 'username'));
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

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }

  const result = await UserService.uploadAvatar(user.userId, req.file);
  sendSuccess(res, result);
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
