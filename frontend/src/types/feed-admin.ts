import type { FeedCard, FeedCardType } from '@/types/feed';

export interface FeedWeights {
  freshness: number;
  trending: number;
  affinity: number;
  follow: number;
  contributor_affinity: number;
  seen_penalty: number;
}

export interface FeedDiversityConfig {
  max_per_contributor: number;
  max_per_category: number;
  max_per_type: number;
  discovery_min_interval: number;
  discovery_max_interval: number;
}

export interface FeedConfig {
  weights: FeedWeights;
  diversity: FeedDiversityConfig;
  enabled_card_types: FeedCardType[];
}

export type UpdateFeedConfigInput = Partial<{
  weights: Partial<FeedWeights>;
  diversity: Partial<FeedDiversityConfig>;
  enabled_card_types: FeedCardType[];
  // Stored in the AuditLog entry this update creates — see
  // FeedConfigHistory.tsx / GET /admin/audit-logs?target_type=feed_config.
  reason: string;
}>;

// --- Live Preview (Phase 4C, Stage 1) -------------------------------------------------

export const FEED_PREVIEW_PERSONAS = [
  'anonymous',
  'new_user',
  'regular',
  'contributor',
  'power_user',
  'admin',
] as const;
export type FeedPreviewPersona = (typeof FEED_PREVIEW_PERSONAS)[number];

export interface PreviewFeedInput {
  mode: 'community' | 'for-you';
  persona: FeedPreviewPersona;
  config?: Partial<{
    weights: Partial<FeedWeights>;
    diversity: Partial<FeedDiversityConfig>;
    enabled_card_types: FeedCardType[];
  }>;
}

export interface PreviewFeedResult {
  cards: FeedCard[];
  persona: FeedPreviewPersona;
  simulated_user_id: string | null;
}

// --- Configuration History (Phase 4C, Stage 1) ----------------------------------------
// Lists via the existing GET /admin/audit-logs?target_type=feed_config — no
// bespoke history endpoint. Shape mirrors AdminService.toAuditLogDto().

export interface FeedConfigHistoryEntry {
  id: string;
  action: string;
  actor: { id: string; username: string; display_name: string | null } | null;
  old_value: Record<string, unknown> | null;
  new_value: (Record<string, unknown> & { reason?: string | null }) | null;
  created_at: string;
}

export type FeedPinType = 'featured' | 'editors_pick';

export interface FeedPin {
  id: string;
  pin_type: FeedPinType;
  position: number;
  pinned_by: string;
  note: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  resource: {
    id: string;
    slug: string;
    title: string;
    type: string;
    thumbnail_url: string | null;
  };
}

export interface CreateFeedPinInput {
  resource_id: string;
  pin_type: FeedPinType;
  position?: number;
  note?: string;
  starts_at?: string;
  ends_at?: string;
}

export type UpdateFeedPinInput = Partial<{
  position: number;
  note: string | null;
  starts_at: string | null;
  ends_at: string | null;
}>;

export interface FeedAnnouncement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  created_by: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedAnnouncementInput {
  title: string;
  body: string;
  link_url?: string;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
}

export type UpdateFeedAnnouncementInput = Partial<{
  title: string;
  body: string;
  link_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}>;
