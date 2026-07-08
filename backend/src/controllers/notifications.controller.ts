import type { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';

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
  const user = requireUser(req);
  const pagination = parsePagination(req.query as Record<string, string>);
  const unreadOnly = req.query.unread === 'true';
  const result = await NotificationService.list(user.userId, pagination, unreadOnly);
  sendSuccess(res, result.data, { ...result.meta, unread_count: result.unreadCount });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await NotificationService.markRead(user.userId, requireParam(req, 'id'));
  sendSuccess(res, { message: 'Notification marked as read.' });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await NotificationService.markAllRead(user.userId);
  sendSuccess(res, { message: 'All notifications marked as read.' });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await NotificationService.delete(user.userId, requireParam(req, 'id'));
  sendSuccess(res, { message: 'Notification deleted.' });
}
