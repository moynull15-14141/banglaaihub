import type { Response } from 'express';

export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasNextPage?: boolean;
  unread_count?: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: ResponseMeta,
  statusCode = 200,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details: unknown[] = [],
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
  });
}

export function sendNotImplemented(
  res: Response,
  message = 'This endpoint is not implemented yet.',
): void {
  sendError(res, 501, 'NOT_IMPLEMENTED', message);
}
