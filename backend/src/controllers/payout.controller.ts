import type { Request, Response } from 'express';
import { PayoutService } from '../services/payout.service';
import { WalletService } from '../services/wallet.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';
import type {
  ListPayoutsQuery,
  MarkPayoutPaidInput,
  PayoutDecisionInput,
  RequestPayoutInput,
} from '../validators/payout.validator';

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

// --- Wallet (self) -----------------------------------------------------------

export async function getMyWallet(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await WalletService.getSummary(user.userId);
  sendSuccess(res, result);
}

// --- Payout requests (self) ---------------------------------------------------

export async function listMyPayouts(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const result = await PayoutService.listMine(user.userId);
  sendSuccess(res, result);
}

export async function requestPayout(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as RequestPayoutInput;
  const result = await PayoutService.request(user.userId, {
    amountCents: body.amount_cents,
    currency: body.currency,
    method: body.method,
    destination: body.destination,
  });
  sendSuccess(res, result, undefined, 201);
}

// --- Admin payout queue --------------------------------------------------------

export async function listPayoutsForAdmin(req: Request, res: Response): Promise<void> {
  const query = (req.validatedQuery ?? {}) as ListPayoutsQuery;
  const result = await PayoutService.listForAdmin(query.status);
  sendSuccess(res, result);
}

export async function approvePayout(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = (req.validatedBody ?? {}) as PayoutDecisionInput;
  const result = await PayoutService.approve(requireParam(req, 'id'), user.userId, body.notes);
  sendSuccess(res, result);
}

export async function rejectPayout(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = (req.validatedBody ?? {}) as PayoutDecisionInput;
  const result = await PayoutService.reject(requireParam(req, 'id'), user.userId, body.notes);
  sendSuccess(res, result);
}

export async function markPayoutPaid(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const body = req.validatedBody as MarkPayoutPaidInput;
  const result = await PayoutService.markPaid(requireParam(req, 'id'), user.userId, body.paid_reference);
  sendSuccess(res, result);
}
