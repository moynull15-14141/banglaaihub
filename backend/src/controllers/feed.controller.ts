import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { FeedService } from '../services/feed.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';
import type { GetFeedQuery, RecordImpressionsInput } from '../validators/feed.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

export async function getFeed(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as GetFeedQuery;

  // `explain` is a client-supplied query flag but only ever honored after a
  // real permission check here — never trusted on its own. Silently
  // downgraded to false for non-admins rather than erroring, since this is
  // a diagnostic add-on to a normal feed request, not a distinct endpoint.
  let explain = false;
  if (query.explain && req.user) {
    const permissions = await AuthService.getUserPermissions(req.user.userId);
    explain = permissions.has('admin:manage');
  }

  const result = await FeedService.getFeed(
    query.mode ?? 'newest',
    query.cursor,
    query.limit,
    req.user?.userId ?? null,
    explain,
  );
  sendSuccess(res, result.data, { next_cursor: result.nextCursor, mode: result.mode });
}

export async function recordImpressions(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as RecordImpressionsInput;
  await FeedService.recordImpressions(user.userId, body.resource_ids);
  sendSuccess(res, { recorded: body.resource_ids.length });
}
