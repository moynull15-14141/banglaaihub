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
