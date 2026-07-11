import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import { FEED_CARD_TYPES, type FeedCardType, type UpdateFeedConfigInput } from '../validators/feed.validator';

export type { FeedCardType };

export interface FeedWeights {
  freshness: number;
  trending: number;
  affinity: number;
  follow: number;
  contributorAffinity: number;
  seenPenalty: number;
}

export interface FeedDiversityConfig {
  maxPerContributor: number;
  maxPerCategory: number;
  maxPerType: number;
  discoveryMinInterval: number;
  discoveryMaxInterval: number;
}

export interface FeedConfig {
  weights: FeedWeights;
  diversity: FeedDiversityConfig;
  enabledCardTypes: FeedCardType[];
}

const FEED_CONFIG_KEY = 'feed_config';

const DEFAULT_FEED_CONFIG: FeedConfig = {
  weights: {
    freshness: 1,
    trending: 1,
    affinity: 1.5,
    follow: 2,
    contributorAffinity: 1,
    seenPenalty: 1.5,
  },
  diversity: {
    maxPerContributor: 2,
    maxPerCategory: 3,
    maxPerType: 4,
    discoveryMinInterval: 10,
    discoveryMaxInterval: 15,
  },
  enabledCardTypes: [...FEED_CARD_TYPES],
};

function toFeedConfigDto(config: FeedConfig): Record<string, unknown> {
  return {
    weights: {
      freshness: config.weights.freshness,
      trending: config.weights.trending,
      affinity: config.weights.affinity,
      follow: config.weights.follow,
      contributor_affinity: config.weights.contributorAffinity,
      seen_penalty: config.weights.seenPenalty,
    },
    diversity: {
      max_per_contributor: config.diversity.maxPerContributor,
      max_per_category: config.diversity.maxPerCategory,
      max_per_type: config.diversity.maxPerType,
      discovery_min_interval: config.diversity.discoveryMinInterval,
      discovery_max_interval: config.diversity.discoveryMaxInterval,
    },
    enabled_card_types: config.enabledCardTypes,
  };
}

export class FeedSettingsService {
  static async getConfig(): Promise<FeedConfig> {
    const row = await prisma.platformSetting.findUnique({ where: { key: FEED_CONFIG_KEY } });
    if (!row || typeof row.value !== 'object' || row.value === null) return DEFAULT_FEED_CONFIG;

    const value = row.value as Partial<ReturnType<typeof toFeedConfigDto>> & {
      weights?: Partial<Record<string, number>>;
      diversity?: Partial<Record<string, number>>;
      enabled_card_types?: FeedCardType[];
    };

    return {
      weights: {
        freshness: value.weights?.freshness ?? DEFAULT_FEED_CONFIG.weights.freshness,
        trending: value.weights?.trending ?? DEFAULT_FEED_CONFIG.weights.trending,
        affinity: value.weights?.affinity ?? DEFAULT_FEED_CONFIG.weights.affinity,
        follow: value.weights?.follow ?? DEFAULT_FEED_CONFIG.weights.follow,
        contributorAffinity: value.weights?.contributor_affinity ?? DEFAULT_FEED_CONFIG.weights.contributorAffinity,
        seenPenalty: value.weights?.seen_penalty ?? DEFAULT_FEED_CONFIG.weights.seenPenalty,
      },
      diversity: {
        maxPerContributor: value.diversity?.max_per_contributor ?? DEFAULT_FEED_CONFIG.diversity.maxPerContributor,
        maxPerCategory: value.diversity?.max_per_category ?? DEFAULT_FEED_CONFIG.diversity.maxPerCategory,
        maxPerType: value.diversity?.max_per_type ?? DEFAULT_FEED_CONFIG.diversity.maxPerType,
        discoveryMinInterval:
          value.diversity?.discovery_min_interval ?? DEFAULT_FEED_CONFIG.diversity.discoveryMinInterval,
        discoveryMaxInterval:
          value.diversity?.discovery_max_interval ?? DEFAULT_FEED_CONFIG.diversity.discoveryMaxInterval,
      },
      enabledCardTypes: value.enabled_card_types ?? DEFAULT_FEED_CONFIG.enabledCardTypes,
    };
  }

  static async getConfigDto(): Promise<Record<string, unknown>> {
    return toFeedConfigDto(await this.getConfig());
  }

  // Shared by updateConfig() (persists) and the Live Preview endpoint
  // (never persists) so the snake_case-input -> FeedConfig merge only
  // exists once — see admin.controller.ts's previewFeedConfig.
  static mergeConfigPatch(
    current: FeedConfig,
    input: Pick<UpdateFeedConfigInput, 'weights' | 'diversity' | 'enabled_card_types'>,
  ): FeedConfig {
    return {
      weights: {
        freshness: input.weights?.freshness ?? current.weights.freshness,
        trending: input.weights?.trending ?? current.weights.trending,
        affinity: input.weights?.affinity ?? current.weights.affinity,
        follow: input.weights?.follow ?? current.weights.follow,
        contributorAffinity: input.weights?.contributor_affinity ?? current.weights.contributorAffinity,
        seenPenalty: input.weights?.seen_penalty ?? current.weights.seenPenalty,
      },
      diversity: {
        maxPerContributor: input.diversity?.max_per_contributor ?? current.diversity.maxPerContributor,
        maxPerCategory: input.diversity?.max_per_category ?? current.diversity.maxPerCategory,
        maxPerType: input.diversity?.max_per_type ?? current.diversity.maxPerType,
        discoveryMinInterval: input.diversity?.discovery_min_interval ?? current.diversity.discoveryMinInterval,
        discoveryMaxInterval: input.diversity?.discovery_max_interval ?? current.diversity.discoveryMaxInterval,
      },
      enabledCardTypes: input.enabled_card_types ?? current.enabledCardTypes,
    };
  }

  static async updateConfig(
    input: UpdateFeedConfigInput,
    updatedBy: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<Record<string, unknown>> {
    const current = await this.getConfig();
    const currentDto = toFeedConfigDto(current);
    const next = this.mergeConfigPatch(current, input);

    const dto = toFeedConfigDto(next);
    await prisma.platformSetting.upsert({
      where: { key: FEED_CONFIG_KEY },
      create: { key: FEED_CONFIG_KEY, value: dto as never, updatedBy },
      update: { value: dto as never, updatedBy },
    });

    // Configuration History (Phase 4C, Stage 1) — reuses the existing
    // AuditLog table (oldValue/newValue JSONB) rather than a new versioning
    // model. `reason` has no dedicated column on AuditLog, so it's embedded
    // in newValue alongside the config snapshot.
    await writeAuditLog({
      actorId: updatedBy,
      action: 'feed_config_updated',
      targetType: 'feed_config',
      targetId: FEED_CONFIG_KEY,
      oldValue: currentDto as object,
      newValue: { ...dto, reason: input.reason ?? null } as object,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return dto;
  }

  // History is intentionally NOT a bespoke method here — the existing
  // GET /admin/audit-logs?target_type=feed_config (AdminService.listAuditLogs)
  // already lists these AuditLog rows with actor info and pagination; the
  // frontend calls that endpoint directly rather than this file growing a
  // second, parallel history-listing implementation.

  // Restores a prior version by replaying it through updateConfig() — this
  // creates a NEW AuditLog entry rather than mutating or deleting the
  // selected history row, so history is monotonic and never overwritten.
  static async rollbackToVersion(
    auditLogId: string,
    actorId: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<Record<string, unknown>> {
    const row = await prisma.auditLog.findFirst({
      where: { id: auditLogId, targetType: 'feed_config', targetId: FEED_CONFIG_KEY },
    });
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'Feed configuration history entry not found.');
    }

    const snapshot = (row.newValue ?? {}) as Record<string, unknown>;
    const restoreInput: UpdateFeedConfigInput = {
      weights: snapshot.weights as UpdateFeedConfigInput['weights'],
      diversity: snapshot.diversity as UpdateFeedConfigInput['diversity'],
      enabled_card_types: snapshot.enabled_card_types as FeedCardType[],
      reason: `Rollback to version from ${row.createdAt.toISOString()}`,
    };

    return this.updateConfig(restoreInput, actorId, context);
  }
}
