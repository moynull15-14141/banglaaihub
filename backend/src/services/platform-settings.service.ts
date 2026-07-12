import { prisma } from '../config/database';

// First (and so far only) key in the generic PlatformSetting table — the
// Pending Review page's toggle. `true` (the default when no row exists yet)
// matches every deployment's existing behavior: submissions sit in the
// pending queue until a moderator approves them. Flipping it off makes
// ResourceService.create() approve new submissions immediately instead —
// see resources.service.ts's autoApprove().
const REQUIRE_MANUAL_APPROVAL_KEY = 'require_manual_approval';

// Paid Resource Downloads — lets a super_admin configure SSLCommerz
// credentials from the admin panel instead of only via backend .env (which
// needs a redeploy to change). SslcommerzService checks this table first
// and falls back to the SSLCOMMERZ_* env vars only if no row exists here,
// so an existing env-only setup keeps working unchanged.
const SSLCOMMERZ_CONFIG_KEY = 'sslcommerz_config';

export interface SslcommerzConfig {
  storeId: string;
  storePassword: string;
  isLive: boolean;
}

export class PlatformSettingsService {
  static async getRequireManualApproval(): Promise<boolean> {
    const row = await prisma.platformSetting.findUnique({ where: { key: REQUIRE_MANUAL_APPROVAL_KEY } });
    if (!row) return true;
    return row.value === true;
  }

  static async setRequireManualApproval(enabled: boolean, updatedBy: string): Promise<boolean> {
    await prisma.platformSetting.upsert({
      where: { key: REQUIRE_MANUAL_APPROVAL_KEY },
      create: { key: REQUIRE_MANUAL_APPROVAL_KEY, value: enabled, updatedBy },
      update: { value: enabled, updatedBy },
    });
    return enabled;
  }

  static async getSslcommerzConfig(): Promise<SslcommerzConfig | null> {
    const row = await prisma.platformSetting.findUnique({ where: { key: SSLCOMMERZ_CONFIG_KEY } });
    if (!row) return null;
    return row.value as unknown as SslcommerzConfig;
  }

  // storePassword is optional here so the admin can update just storeId/
  // isLive without having to re-paste the password every time — the
  // controller merges this with the existing stored password when omitted.
  static async setSslcommerzConfig(config: SslcommerzConfig, updatedBy: string): Promise<void> {
    await prisma.platformSetting.upsert({
      where: { key: SSLCOMMERZ_CONFIG_KEY },
      create: { key: SSLCOMMERZ_CONFIG_KEY, value: config as unknown as object, updatedBy },
      update: { value: config as unknown as object, updatedBy },
    });
  }
}
