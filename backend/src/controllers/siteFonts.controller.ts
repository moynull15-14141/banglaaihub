import type { Request, Response } from 'express';
import { SiteFontService } from '../services/siteFonts.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';
import type { FontSlot } from '../generated/prisma/client';
import type { UploadFontFileQuery, UpsertFontInput } from '../validators/siteFonts.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

function requireSlot(req: Request): FontSlot {
  const slot = req.params.slot;
  if (slot !== 'sans' && slot !== 'heading' && slot !== 'mono') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid font slot.');
  }
  return slot;
}

export async function getActiveFonts(_req: Request, res: Response): Promise<void> {
  const result = await SiteFontService.getActiveFonts();
  sendSuccess(res, result);
}

export async function getCatalog(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, SiteFontService.getCatalog());
}

export async function upsertFont(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpsertFontInput;
  const result = await SiteFontService.upsertFont(requireSlot(req), user.userId, body);
  sendSuccess(res, result);
}

export async function uploadFontFile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const query = req.validatedQuery as UploadFontFileQuery;
  const result = await SiteFontService.attachFontFile(requireSlot(req), user.userId, query.weight, query.style, req.file);
  sendSuccess(res, result, undefined, 201);
}

export async function resetFont(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await SiteFontService.resetFont(requireSlot(req), user.userId);
  sendSuccess(res, { message: 'Font reset to default.' });
}
