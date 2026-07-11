import { z } from 'zod';

// `for-you` and `following` require authentication (enforced in
// feed.service.ts, not here — this schema only validates shape).
export const FEED_MODES = ['newest', 'trending', 'for-you', 'following', 'community'] as const;
export type FeedMode = (typeof FEED_MODES)[number];

export const getFeedQuerySchema = z.object({
  mode: z.enum(FEED_MODES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  // Admin-only diagnostic flag (checked server-side against a real
  // permission, not trusted from the query string alone) — see
  // feedController.getFeed. Silently ignored for non-admins.
  explain: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});
export type GetFeedQuery = z.infer<typeof getFeedQuerySchema>;

// --- Impressions (Phase 4C, Stage 1) --------------------------------------------------
// Closes the previously-dormant seen-penalty loop in scoring/affinity.ts's
// getSeenPenalties() — that function has always read FeedInteraction rows,
// nothing wrote them until this endpoint existed.

export const recordImpressionsSchema = z.object({
  resource_ids: z.array(z.string().uuid()).min(1).max(50),
});
export type RecordImpressionsInput = z.infer<typeof recordImpressionsSchema>;

// Every card type feed.service.ts can actually produce. The Prisma schema's
// FeedCardType enum has more values reserved for stubbed-out future work
// (collection_shared, event_upcoming, sponsored_content) — excluded here
// since there's no code path that emits them yet, and this list also drives
// the admin panel's enable/disable checklist.
export const FEED_CARD_TYPES = [
  'resource_published',
  'featured_resource',
  'trending_resource',
  'follow_activity',
  'editors_pick',
  'admin_announcement',
  'user_post',
] as const;
export type FeedCardType = (typeof FEED_CARD_TYPES)[number];

// --- Admin: feed ranking config ------------------------------------------------------

export const updateFeedConfigSchema = z.object({
  weights: z
    .object({
      freshness: z.number().min(0).max(10),
      trending: z.number().min(0).max(10),
      affinity: z.number().min(0).max(10),
      follow: z.number().min(0).max(10),
      contributor_affinity: z.number().min(0).max(10),
      seen_penalty: z.number().min(0).max(10),
    })
    .partial()
    .optional(),
  diversity: z
    .object({
      max_per_contributor: z.number().int().min(1).max(20),
      max_per_category: z.number().int().min(1).max(20),
      max_per_type: z.number().int().min(1).max(20),
      discovery_min_interval: z.number().int().min(1).max(50),
      discovery_max_interval: z.number().int().min(1).max(50),
    })
    .partial()
    .optional(),
  enabled_card_types: z.array(z.enum(FEED_CARD_TYPES)).optional(),
  // Optional human-readable note stored alongside this change in the
  // AuditLog entry (Phase 4C, Stage 1 — Configuration History).
  reason: z.string().max(500).optional(),
});
export type UpdateFeedConfigInput = z.infer<typeof updateFeedConfigSchema>;

// --- Admin: Live Feed Preview (Phase 4C, Stage 1) ------------------------------------
// Runs the real ranking engine against a draft (unsaved) config + a
// simulated persona. Read-only — never persists, never touches feedCache.

export const FEED_PREVIEW_PERSONAS = [
  'anonymous',
  'new_user',
  'regular',
  'contributor',
  'power_user',
  'admin',
] as const;
export type FeedPreviewPersona = (typeof FEED_PREVIEW_PERSONAS)[number];

export const previewFeedSchema = z.object({
  mode: z.enum(['community', 'for-you']),
  persona: z.enum(FEED_PREVIEW_PERSONAS),
  config: updateFeedConfigSchema.omit({ reason: true }).optional(),
});
export type PreviewFeedInput = z.infer<typeof previewFeedSchema>;

// Config history has no dedicated schema here — the frontend lists it via
// the existing GET /admin/audit-logs?target_type=feed_config
// (listAuditLogsQuerySchema in admin.validator.ts already covers this).

// --- Admin: feed pins (Featured / Editor's Pick placement) --------------------------

export const FEED_PIN_TYPES = ['featured', 'editors_pick'] as const;

export const createFeedPinSchema = z.object({
  resource_id: z.string().uuid(),
  pin_type: z.enum(FEED_PIN_TYPES),
  position: z.number().int().min(0).optional(),
  note: z.string().max(280).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});
export type CreateFeedPinInput = z.infer<typeof createFeedPinSchema>;

export const updateFeedPinSchema = z.object({
  position: z.number().int().min(0).optional(),
  note: z.string().max(280).nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
});
export type UpdateFeedPinInput = z.infer<typeof updateFeedPinSchema>;

// --- Admin: feed announcements -------------------------------------------------------

export const createFeedAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  link_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
});
export type CreateFeedAnnouncementInput = z.infer<typeof createFeedAnnouncementSchema>;

export const updateFeedAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  link_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
});
export type UpdateFeedAnnouncementInput = z.infer<typeof updateFeedAnnouncementSchema>;
