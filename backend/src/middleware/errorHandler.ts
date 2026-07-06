import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { sendError } from '../utils/apiResponse';

export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    404,
    'RESOURCE_NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} does not exist.`,
  );
}

// Express identifies error-handling middleware by its exact 4-parameter arity.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    logger.warn(`${err.code}: ${err.message}`, { requestId: req.id, statusCode: err.statusCode });
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error(error.message, { requestId: req.id, stack: error.stack });

  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production' ? 'Something went wrong.' : error.message,
  );
}
