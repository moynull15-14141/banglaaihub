import { env } from './env';

// Fallback only — SslcommerzService.resolveCredentials() checks the
// admin-panel-configured PlatformSetting row first (see
// platform-settings.service.ts) and only falls back to these env vars when
// no row exists, so an existing env-only deployment keeps working.
export const sslcommerzStoreId = env.SSLCOMMERZ_STORE_ID;
export const sslcommerzStorePassword = env.SSLCOMMERZ_STORE_PASSWORD;
export const sslcommerzIsLive = env.SSLCOMMERZ_IS_LIVE === 'true';
