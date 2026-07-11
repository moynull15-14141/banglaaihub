import type { Request, Response } from 'express';
import { MessagingService } from '../services/messaging.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import type { AccessTokenPayload } from '../utils/jwt';
import type { SendMessageInput } from '../validators/messaging.validator';

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

export async function listConversations(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await MessagingService.listConversations(user.userId, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const count = await MessagingService.getUnreadCount(user.userId);
  sendSuccess(res, { unread_count: count });
}

export async function sendMessageToUser(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as SendMessageInput;
  const result = await MessagingService.sendMessageTo(user.userId, requireParam(req, 'username'), body);
  sendSuccess(res, result, undefined, 201);
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const pagination = parsePagination(req.query as Record<string, string>);
  const result = await MessagingService.getMessages(requireParam(req, 'id'), user.userId, pagination);
  sendSuccess(res, result.data, result.meta);
}

export async function sendMessageInConversation(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as SendMessageInput;
  const result = await MessagingService.sendMessageIn(requireParam(req, 'id'), user.userId, body);
  sendSuccess(res, result, undefined, 201);
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await MessagingService.markConversationRead(requireParam(req, 'id'), user.userId);
  sendSuccess(res, { message: 'Marked as read.' });
}
