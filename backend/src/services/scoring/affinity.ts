import { prisma } from '../../config/database';

// How strongly a user's own behavior (not raw counts) pulls a candidate's
// score — kept small and squashed via normalize() below rather than a raw
// sum, since a power user with thousands of events shouldn't produce a
// score so large it drowns out freshness/trending entirely.
const AFFINITY_WINDOW_DAYS = 90;
const AFFINITY_EVENT_WEIGHTS: Record<string, number> = {
  download: 3,
  bookmark: 2,
  like: 2,
  view: 1,
};
// Tags are a weaker, noisier signal than category/author — every resource
// carries several, so a single tag match shouldn't count as much as a
// category match.
const TAG_WEIGHT_MULTIPLIER = 0.5;

export interface UserAffinity {
  categoryWeights: Map<number, number>;
  tagWeights: Map<string, number>;
  authorWeights: Map<string, number>;
}

export const EMPTY_AFFINITY: UserAffinity = {
  categoryWeights: new Map(),
  tagWeights: new Map(),
  authorWeights: new Map(),
};

// Squashes an unbounded weight sum into (0, 1) — 0 at raw=0, approaching 1
// as raw grows, so it stays on the same rough scale as freshnessScore
// without needing a per-request max to normalize against.
export function normalize(raw: number, constant = 8): number {
  if (raw <= 0) return 0;
  return raw / (raw + constant);
}

// Builds a per-user category/tag/author weight map from their own recent
// ResourceAnalytics events — the basis for "For You" personalization.
// Capped at 1000 events so a very active user's history stays a bounded,
// single query rather than growing unboundedly over time.
export async function getUserAffinity(userId: string): Promise<UserAffinity> {
  const since = new Date(Date.now() - AFFINITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const events = await prisma.resourceAnalytics.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      eventType: { in: ['view', 'download', 'bookmark', 'like'] },
    },
    select: { resourceId: true, eventType: true },
    take: 1000,
  });

  if (events.length === 0) return { categoryWeights: new Map(), tagWeights: new Map(), authorWeights: new Map() };

  const resourceIds = Array.from(new Set(events.map((e) => e.resourceId)));
  const resources = await prisma.resource.findMany({
    where: { id: { in: resourceIds } },
    select: {
      id: true,
      categoryId: true,
      authorId: true,
      resourceTags: { select: { tag: { select: { name: true } } } },
    },
  });
  const byId = new Map(resources.map((r) => [r.id, r]));

  const categoryWeights = new Map<number, number>();
  const tagWeights = new Map<string, number>();
  const authorWeights = new Map<string, number>();

  for (const event of events) {
    const weight = AFFINITY_EVENT_WEIGHTS[event.eventType] ?? 0;
    if (weight === 0) continue;
    const resource = byId.get(event.resourceId);
    if (!resource) continue;

    if (resource.categoryId) {
      categoryWeights.set(resource.categoryId, (categoryWeights.get(resource.categoryId) ?? 0) + weight);
    }
    if (resource.authorId) {
      authorWeights.set(resource.authorId, (authorWeights.get(resource.authorId) ?? 0) + weight);
    }
    for (const rt of resource.resourceTags) {
      tagWeights.set(rt.tag.name, (tagWeights.get(rt.tag.name) ?? 0) + weight * TAG_WEIGHT_MULTIPLIER);
    }
  }

  return { categoryWeights, tagWeights, authorWeights };
}

export function computeAffinityScore(
  candidate: { categoryId: number | null; tags: string[] },
  affinity: UserAffinity,
): number {
  const categoryRaw = candidate.categoryId ? (affinity.categoryWeights.get(candidate.categoryId) ?? 0) : 0;
  const tagRaw = candidate.tags.reduce((sum, tag) => sum + (affinity.tagWeights.get(tag) ?? 0), 0);
  return normalize(categoryRaw + tagRaw);
}

export function computeContributorAffinityScore(authorId: string | null, affinity: UserAffinity): number {
  if (!authorId) return 0;
  return normalize(affinity.authorWeights.get(authorId) ?? 0);
}

// Anti-repetition — reads FeedInteraction impression rows written by
// POST /feed/impressions (Phase 4). Until that endpoint ships this always
// returns an empty map (score contribution 0), which is correct: a brand
// new signal source should start at zero effect, not fail or fake data.
export async function getSeenPenalties(userId: string, resourceIds: string[]): Promise<Map<string, number>> {
  if (resourceIds.length === 0) return new Map();

  const rows = await prisma.feedInteraction.findMany({
    where: { userId, resourceId: { in: resourceIds }, type: 'impression', revokedAt: null },
    select: { resourceId: true, impressionCount: true, updatedAt: true },
  });

  const penalties = new Map<string, number>();
  for (const row of rows) {
    if (!row.resourceId) continue;
    const daysSinceSeen = (Date.now() - row.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    penalties.set(row.resourceId, normalize(row.impressionCount / (1 + daysSinceSeen), 3));
  }
  return penalties;
}
