import { prisma } from '../config/database';

// First (and so far only) key in the generic PlatformSetting table — the
// Pending Review page's toggle. `true` (the default when no row exists yet)
// matches every deployment's existing behavior: submissions sit in the
// pending queue until a moderator approves them. Flipping it off makes
// ResourceService.create() approve new submissions immediately instead —
// see resources.service.ts's autoApprove().
const REQUIRE_MANUAL_APPROVAL_KEY = 'require_manual_approval';

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
}
