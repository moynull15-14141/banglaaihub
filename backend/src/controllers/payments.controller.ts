import type { Request, Response } from 'express';
import { env } from '../config/env';
import { ResourcePurchaseService } from '../services/resourcePurchase.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';

// SSLCommerz calls this server-to-server after a payment attempt — the only
// call that actually marks a purchase complete (see
// ResourcePurchaseService.handleIpn's own comment on why the posted body
// alone is never trusted). Always 200s so SSLCommerz doesn't endlessly
// retry a webhook whose payload we've already decided to ignore (unknown/
// mismatched transaction) — those cases are logged inside the service.
export async function ipn(req: Request, res: Response): Promise<void> {
  const { tran_id: tranId, val_id: valId } = req.body as { tran_id?: string; val_id?: string };
  if (tranId && valId) {
    await ResourcePurchaseService.handleIpn(tranId, valId);
  }
  sendSuccess(res, { received: true });
}

// success_url/fail_url/cancel_url — SSLCommerz's hosted page submits a POST
// here after the customer finishes (or abandons) checkout. This is purely
// cosmetic: it redirects the BROWSER on to the frontend's result page,
// which then refetches the resource's is_purchased state rather than
// trusting these query params — the IPN call above is the only source of
// truth for whether a purchase actually completed.
function redirectToResult(req: Request, res: Response, status: 'success' | 'fail' | 'cancel'): void {
  const tranId = (req.body as { tran_id?: string })?.tran_id ?? (req.query.tran_id as string | undefined);
  const url = new URL('/payments/result', env.FRONTEND_URL);
  url.searchParams.set('status', status);
  if (tranId) url.searchParams.set('tran_id', tranId);
  res.redirect(303, url.toString());
}

export function success(req: Request, res: Response): void {
  redirectToResult(req, res, 'success');
}

export function fail(req: Request, res: Response): void {
  redirectToResult(req, res, 'fail');
}

export function cancel(req: Request, res: Response): void {
  redirectToResult(req, res, 'cancel');
}

// GET /payments/purchases/:id — polled by /payments/result after returning
// from SSLCommerz.
export async function getPurchaseStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  const id = req.params.id;
  if (typeof id !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Missing or invalid route parameter: id');
  }
  const result = await ResourcePurchaseService.getStatus(id, req.user.userId);
  sendSuccess(res, result);
}
