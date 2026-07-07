import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header.'));
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired access token.'));
  }
}

// For routes that must stay publicly reachable (anonymous browsing) but
// still want req.user populated when the caller happens to be logged in —
// e.g. GET /resources/:slug, whose service layer already branches on
// `requester?.userId` to let an owner or moderator see their own
// pending/rejected resource. Never rejects; a missing or invalid token just
// leaves req.user unset, identical to today's anonymous behavior.
export function authenticateOptional(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      // Invalid/expired token on an optional-auth route — treat as anonymous
      // rather than failing the request.
    }
  }

  next();
}
