import type { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { ReviewService } from '../services/review.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
} from '../validators/review.validator';
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
  const query = (req.validatedQuery ?? {}) as ListReviewsQuery;
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await ReviewService.list(requireParam(req, 'slug'), query, pagination, req.user);
  sendSuccess(res, result.data, result.meta);
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const summary = await ReviewService.getRatingSummary(requireParam(req, 'slug'));
  sendSuccess(res, summary);
}

export async function create(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateReviewInput;
  const result = await ReviewService.create(requireParam(req, 'slug'), user, body);
  sendSuccess(res, result, undefined, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateReviewInput;
  const result = await ReviewService.update(requireParam(req, 'id'), user, body);
  sendSuccess(res, result);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await ReviewService.remove(requireParam(req, 'id'), user);
  sendSuccess(res, { message: 'Review deleted.' });
}

export async function markHelpful(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await ReviewService.markHelpful(requireParam(req, 'id'), user);
  sendSuccess(res, result, undefined, 201);
}

export async function unmarkHelpful(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await ReviewService.unmarkHelpful(requireParam(req, 'id'), user);
  sendSuccess(res, { message: 'Helpful vote removed.' });
}

export async function report(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as CreateReportInput;
  const result = await ReportService.create(
    user.userId,
    { reviewId: requireParam(req, 'id') },
    body.reason,
    body.description,
  );
  sendSuccess(res, result, undefined, 201);
}
