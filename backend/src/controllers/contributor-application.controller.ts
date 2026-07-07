import type { Request, Response } from 'express';
import { ContributorApplicationService } from '../services/contributor-application.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  AddSampleFileQuery,
  SubmitContributorApplicationInput,
  UpdateContributorApplicationInput,
} from '../validators/contributor-application.validator';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

export async function submit(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as SubmitContributorApplicationInput;
  const application = await ContributorApplicationService.submit(user.userId, body);
  sendSuccess(res, application, undefined, 201);
}

export async function getMine(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const application = await ContributorApplicationService.getOwn(user.userId);
  sendSuccess(res, application);
}

export async function updateMine(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as UpdateContributorApplicationInput;
  const application = await ContributorApplicationService.updateOwn(user.userId, body);
  sendSuccess(res, application);
}

export async function withdrawMine(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  await ContributorApplicationService.withdrawOwn(user.userId);
  sendSuccess(res, { message: 'Application withdrawn.' });
}

export async function addSampleFile(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  if (!req.file) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'No file provided.');
  }
  const query = (req.validatedQuery ?? {}) as AddSampleFileQuery;
  const result = await ContributorApplicationService.addSampleFile(
    user.userId,
    req.file,
    query.kind,
  );
  sendSuccess(res, result, undefined, 201);
}
