import type { Request, Response } from 'express';
import { PlatformSettingsService } from '../services/platform-settings.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/apiResponse';
import type { AccessTokenPayload } from '../utils/jwt';

function requireUser(req: Request): AccessTokenPayload {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return req.user;
}

// GET /admin/payment-settings/sslcommerz — the store password is NEVER sent
// back to the client, only whether one is currently saved. Same "write-only
// secret" convention as e.g. a GitHub App's client secret field in most
// admin UIs — the admin can overwrite it, never read it back.
export async function getSslcommerzSettings(_req: Request, res: Response): Promise<void> {
  const config = await PlatformSettingsService.getSslcommerzConfig();
  sendSuccess(res, {
    store_id: config?.storeId ?? null,
    has_store_password: Boolean(config?.storePassword),
    is_live: config?.isLive ?? false,
    configured: Boolean(config?.storeId && config.storePassword),
  });
}

export async function saveSslcommerzSettings(req: Request, res: Response): Promise<void> {
  const user = requireUser(req);
  const { store_id, store_passwd, is_live } = req.body as {
    store_id?: string;
    store_passwd?: string;
    is_live?: boolean;
  };

  if (!store_id) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'store_id is required.');
  }

  // store_passwd is optional on update — omit it to change store_id/is_live
  // without having to re-paste an already-saved password.
  const existing = await PlatformSettingsService.getSslcommerzConfig();
  const storePassword = store_passwd?.trim() || existing?.storePassword;
  if (!storePassword) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'store_passwd is required the first time you configure this.');
  }

  await PlatformSettingsService.setSslcommerzConfig(
    { storeId: store_id.trim(), storePassword, isLive: Boolean(is_live) },
    user.userId,
  );

  sendSuccess(res, { message: 'SSLCommerz settings saved.' });
}
