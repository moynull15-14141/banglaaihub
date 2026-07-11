import type { Request, Response } from 'express';
import { PostService } from '../services/posts.service';
import { ReportService } from '../services/report.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from '../validators/post.validator';
import type { CreateReportInput } from '../validators/resource.validator';

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

export async function list(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListPostsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await PostService.list(pagination, query.author, req.user?.userId);
  sendSuccess(res, result.data, result.meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreatePostInput;
  const result = await PostService.create(user, body, req.file);
  sendSuccess(res, result, undefined, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdatePostInput;
  const result = await PostService.update(requireParam(req, 'id'), user, body);
  sendSuccess(res, result);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await PostService.remove(requireParam(req, 'id'), user);
  sendSuccess(res, { message: 'Post deleted.' });
}

export async function toggleLike(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await PostService.toggleLike(requireParam(req, 'id'), user);
  sendSuccess(res, result);
}

export async function report(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateReportInput;
  const result = await ReportService.create(
    user.userId,
    { postId: requireParam(req, 'id') },
    body.reason,
    body.description,
  );
  sendSuccess(res, result, undefined, 201);
}
