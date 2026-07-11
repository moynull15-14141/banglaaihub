import type { Request, Response } from 'express';
import { CommentService } from '../services/comments.service';
import { ReportService } from '../services/report.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  CreateCommentInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from '../validators/comment.validator';
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
  const query = (req.validatedQuery ?? {}) as ListCommentsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await CommentService.list(requireParam(req, 'slug'), query, pagination, req.user);
  sendSuccess(res, result.data, result.meta);
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateCommentInput;
  const result = await CommentService.create(requireParam(req, 'slug'), user, body);
  sendSuccess(res, result, undefined, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateCommentInput;
  const result = await CommentService.update(requireParam(req, 'id'), user, body);
  sendSuccess(res, result);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await CommentService.remove(requireParam(req, 'id'), user);
  sendSuccess(res, { message: 'Comment deleted.' });
}

export async function report(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateReportInput;
  const result = await ReportService.create(
    user.userId,
    { commentId: requireParam(req, 'id') },
    body.reason,
    body.description,
  );
  sendSuccess(res, result, undefined, 201);
}

// Toggle-like semantics: repurposed from the original "upvote" concept per
// Phase 4A's spec (comment like, not a separate upvote system). Route path
// (/comments/:id/upvote) kept unchanged to avoid a breaking API rename.
export async function upvote(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await CommentService.toggleLike(requireParam(req, 'id'), user);
  sendSuccess(res, result);
}
