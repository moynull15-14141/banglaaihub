import type { Request, Response } from 'express';
import { StatCardImagesService } from '../services/statCardImages.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';
import type { StatCardSlot } from '../generated/prisma/client';

const VALID_SLOTS: StatCardSlot[] = [
  'dataset',
  'paper',
  'tool',
  'model',
  'article',
  'tutorial',
  'prompt',
  'project',
  'news',
];

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

function requireSlot(req: Request): StatCardSlot {
  const slot = req.params.slot as StatCardSlot;
  if (!VALID_SLOTS.includes(slot)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid stat card slot.');
  }
  return slot;
}

export async function getAll(_req: Request, res: Response): Promise<void> {
  const result = await StatCardImagesService.getAll();
  sendSuccess(res, result);
}

export async function upsertImage(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const result = await StatCardImagesService.upsertImage(requireSlot(req), user.userId, req.file);
  sendSuccess(res, result, undefined, 201);
}

export async function resetImage(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await StatCardImagesService.resetImage(requireSlot(req), user.userId);
  sendSuccess(res, { message: 'Stat card image reset to default.' });
}
