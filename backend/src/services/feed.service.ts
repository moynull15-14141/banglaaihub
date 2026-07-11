import { prisma } from '../config/database';
import { feedCache } from '../lib/cache/feedCache';
import { ApiError } from '../utils/ApiError';
import type { FeedMode } from '../validators/feed.validator';
import { FeedSettingsService, type FeedCardType, type FeedConfig } from './feed-settings.service';
import { postInclude, toPostDto } from './posts.service';
import { resourceInclude, toResourceDto, type ResourceWithRelations } from './resources.service';
import { StorageService } from './storage.service';
import {
  computeAffinityScore,
  computeContributorAffinityScore,
  EMPTY_AFFINITY,
  getSeenPenalties,
  getUserAffinity,
  normalize,
  type UserAffinity,
} from './scoring/affinity';
import { applyDiversityPass, injectDiscovery, type DiversityCard } from './scoring/diversity';
import { computeTrendingScores } from './scoring/trending';

// Ranked order isn't a stable DB column (it's computed in JS, same as
// resolveTrendingPage), so pagination can't be plain offset/limit without
// risking dupes/skips as new resources publish between page fetches. Instead
// the full ranked list is computed once and cached as a "snapshot"; the
// cursor just pins a page position within that frozen snapshot. See the
// Phase 4D plan doc §2.5 for the full reasoning.
const SNAPSHOT_TTL_MS = 3 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const CANDIDATE_LIMIT = 500;
const FOLLOWING_CANDIDATE_LIMIT = 300;
const FRESHNESS_HALF_LIFE_HOURS = 48;
// Raw trending scores are an unbounded weighted event count (see
// scoring/trending.ts) — squash to roughly the same 0..1 scale as
// freshness/affinity before combining them in the personalized formula.
// 'trending' mode itself still ranks by the raw score, unaffected.
const TRENDING_NORMALIZATION_CONSTANT = 12;

// Raw (unweighted) per-factor components plus the weights actually applied —
// enough for the admin explainability panel to show both the weighted
// contribution (raw * weight) and the underlying raw signal, without ever
// inventing a number for a factor that isn't real (Featured/Discovery are
// deliberately excluded — see buildScoreBreakdown below).
export interface ScoreBreakdown {
  freshness: number;
  trending: number;
  affinity: number;
  follow: number;
  contributorAffinity: number;
  seenPenalty: number;
  weights: FeedConfig['weights'];
  nonScoringEffects: string[];
}

interface FeedCardScore {
  // Null for non-resource-backed cards (admin_announcement, user_post).
  resourceId: string | null;
  announcementId?: string;
  postId?: string;
  cardType: FeedCardType;
  score: number;
  breakdown?: ScoreBreakdown;
}

const POST_CANDIDATE_LIMIT = 200;
const POST_CANDIDATE_WINDOW_DAYS = 14;
// Post likes are a much smaller-magnitude signal than resource download/
// bookmark/view events (see scoring/trending.ts) — squash separately rather
// than reusing TRENDING_NORMALIZATION_CONSTANT, which is tuned for that
// larger-magnitude weighted event sum.
const POST_LIKE_NORMALIZATION_CONSTANT = 4;

interface PostCandidate {
  postId: string;
  authorId: string | null;
  createdAt: Date;
  likeCount: number;
}

async function fetchRecentPosts(): Promise<PostCandidate[]> {
  const since = new Date(Date.now() - POST_CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.post.findMany({
    where: { status: 'visible', deletedAt: null, createdAt: { gte: since } },
    select: { id: true, authorId: true, createdAt: true, likeCount: true },
    orderBy: { createdAt: 'desc' },
    take: POST_CANDIDATE_LIMIT,
  });
  return rows.map((r) => ({ postId: r.id, authorId: r.authorId, createdAt: r.createdAt, likeCount: r.likeCount }));
}

// Admin announcements are inserted at fixed positions after ranking/
// diversity/discovery, not scored/shuffled alongside resources — they're
// admin-controlled placement, not part of the ranking competition.
const ANNOUNCEMENT_INTERVAL = 20;

async function fetchActiveAnnouncementIds(): Promise<string[]> {
  const now = new Date();
  const rows = await prisma.feedAnnouncement.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  return rows.map((r) => r.id);
}

function spliceAnnouncements(cards: FeedCardScore[], announcementIds: string[]): FeedCardScore[] {
  if (announcementIds.length === 0) return cards;
  const output = cards.slice();
  announcementIds.forEach((id, i) => {
    const position = Math.min(i * ANNOUNCEMENT_INTERVAL, output.length);
    output.splice(position, 0, {
      resourceId: null,
      announcementId: id,
      cardType: 'admin_announcement',
      score: Number.POSITIVE_INFINITY,
    });
  });
  return output;
}

interface FeedSnapshot {
  cards: FeedCardScore[];
}

interface FeedCursor {
  snapshotKey: string;
  index: number;
}

interface CandidateResource {
  resourceId: string;
  authorId: string | null;
  categoryId: number | null;
  type: string;
  publishedAt: Date | null;
  featured: boolean;
  tags: string[];
}

const candidateSelect = {
  id: true,
  authorId: true,
  categoryId: true,
  type: true,
  publishedAt: true,
  featured: true,
  resourceTags: { select: { tag: { select: { name: true } } } },
} as const;

type CandidateRow = {
  id: string;
  authorId: string | null;
  categoryId: number | null;
  type: string;
  publishedAt: Date | null;
  featured: boolean;
  resourceTags: { tag: { name: string } }[];
};

function toCandidate(r: CandidateRow): CandidateResource {
  return {
    resourceId: r.id,
    authorId: r.authorId,
    categoryId: r.categoryId,
    type: r.type,
    publishedAt: r.publishedAt,
    featured: r.featured,
    tags: r.resourceTags.map((rt) => rt.tag.name),
  };
}

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string): FeedCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<FeedCursor>;
    if (typeof parsed.snapshotKey === 'string' && typeof parsed.index === 'number') {
      return { snapshotKey: parsed.snapshotKey, index: parsed.index };
    }
    return null;
  } catch {
    return null;
  }
}

function makeSnapshotKey(mode: FeedMode, userId: string | null): string {
  return `feed:${userId ?? 'guest'}:${mode}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function freshnessScore(publishedAt: Date | null): number {
  if (!publishedAt) return 0;
  const hoursSince = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  return 1 / (1 + Math.max(hoursSince, 0) / FRESHNESS_HALF_LIFE_HOURS);
}

async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  return rows.map((r) => r.followingId);
}

async function buildTrendingSnapshot(): Promise<FeedSnapshot> {
  const candidates = await prisma.resource.findMany({
    where: { status: 'approved', visibility: 'public', deletedAt: null },
    select: { id: true },
    orderBy: { publishedAt: 'desc' },
    take: CANDIDATE_LIMIT,
  });
  const candidateIds = candidates.map((c) => c.id);
  const scores = await computeTrendingScores(candidateIds);
  const cards = candidateIds
    .map((id) => ({ resourceId: id, cardType: 'trending_resource' as const, score: scores.get(id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  return { cards };
}

async function buildNewestSnapshot(): Promise<FeedSnapshot> {
  const resources = await prisma.resource.findMany({
    where: { status: 'approved', visibility: 'public', deletedAt: null },
    select: { id: true, publishedAt: true, featured: true },
    orderBy: { publishedAt: 'desc' },
    take: CANDIDATE_LIMIT,
  });
  const cards = resources.map((r) => ({
    resourceId: r.id,
    cardType: (r.featured ? 'featured_resource' : 'resource_published') as FeedCardType,
    score: freshnessScore(r.publishedAt),
  }));
  return { cards };
}

async function buildFollowingSnapshot(userId: string): Promise<FeedSnapshot> {
  const followingIds = await getFollowingIds(userId);
  if (followingIds.length === 0) return { cards: [] };

  const resources = await prisma.resource.findMany({
    where: { status: 'approved', visibility: 'public', deletedAt: null, authorId: { in: followingIds } },
    select: { id: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: FOLLOWING_CANDIDATE_LIMIT,
  });
  const cards = resources.map((r) => ({
    resourceId: r.id,
    cardType: 'follow_activity' as const,
    score: freshnessScore(r.publishedAt),
  }));
  return { cards };
}

// Shared by 'community' (always non-personalized) and 'for-you' (adds
// affinity/follow/contributor/seen terms when a user history exists). A
// brand-new "for-you" user has empty affinity maps and no follows, so those
// terms all evaluate to 0 and the formula degenerates to freshness+trending
// — i.e. the same cold-start composition as 'community', with no special
// branch needed.
async function buildPersonalizableSnapshot(
  mode: 'community' | 'for-you',
  userId: string | null,
  pageSize: number,
  config: FeedConfig,
): Promise<FeedSnapshot> {
  const now = new Date();

  const [baseRows, pins, postCandidates] = await Promise.all([
    prisma.resource.findMany({
      where: { status: 'approved', visibility: 'public', deletedAt: null },
      select: candidateSelect,
      orderBy: { publishedAt: 'desc' },
      take: CANDIDATE_LIMIT,
    }),
    prisma.feedPin.findMany({
      where: {
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: { resourceId: true, pinType: true },
    }),
    config.enabledCardTypes.includes('user_post') ? fetchRecentPosts() : Promise.resolve<PostCandidate[]>([]),
  ]);

  const candidateMap = new Map<string, CandidateResource>();
  for (const r of baseRows) candidateMap.set(r.id, toCandidate(r));

  let followingIds: string[] = [];
  if (mode === 'for-you' && userId) {
    followingIds = await getFollowingIds(userId);
    if (followingIds.length > 0) {
      const followed = await prisma.resource.findMany({
        where: { status: 'approved', visibility: 'public', deletedAt: null, authorId: { in: followingIds } },
        select: candidateSelect,
        orderBy: { publishedAt: 'desc' },
        take: FOLLOWING_CANDIDATE_LIMIT,
      });
      for (const r of followed) if (!candidateMap.has(r.id)) candidateMap.set(r.id, toCandidate(r));
    }
  }

  // Pull in pinned resources not already in the candidate pool — an admin
  // may want to resurface something older than the recency window.
  const missingPinnedIds = pins.map((p) => p.resourceId).filter((id) => !candidateMap.has(id));
  if (missingPinnedIds.length > 0) {
    const pinnedRows = await prisma.resource.findMany({
      where: { id: { in: missingPinnedIds }, status: 'approved', visibility: 'public', deletedAt: null },
      select: candidateSelect,
    });
    for (const r of pinnedRows) candidateMap.set(r.id, toCandidate(r));
  }

  const pinTypeByResource = new Map(pins.map((p) => [p.resourceId, p.pinType]));
  const followingSet = new Set(followingIds);
  const candidates = Array.from(candidateMap.values());
  const candidateIds = candidates.map((c) => c.resourceId);

  const personalize = mode === 'for-you' && Boolean(userId);
  const [trendingScores, affinity, seenPenalties] = await Promise.all([
    computeTrendingScores(candidateIds),
    personalize ? getUserAffinity(userId as string) : Promise.resolve<UserAffinity>(EMPTY_AFFINITY),
    personalize ? getSeenPenalties(userId as string, candidateIds) : Promise.resolve(new Map<string, number>()),
  ]);

  const w = config.weights;
  type ScoredCard = DiversityCard & { cardType: FeedCardType; isPost?: boolean; breakdown: ScoreBreakdown };
  const scored: ScoredCard[] = candidates.map((c) => {
    const pinType = pinTypeByResource.get(c.resourceId) ?? null;
    const isFollowed = followingSet.has(c.authorId ?? '');
    const isFeatured = pinType === 'featured' || c.featured;
    const cardType: FeedCardType =
      pinType === 'editors_pick'
        ? 'editors_pick'
        : isFeatured
          ? 'featured_resource'
          : mode === 'for-you' && isFollowed
            ? 'follow_activity'
            : 'resource_published';

    const freshness = freshnessScore(c.publishedAt);
    const affinityScore = personalize ? computeAffinityScore(c, affinity) : 0;
    const contributorAffinityScore = personalize ? computeContributorAffinityScore(c.authorId, affinity) : 0;
    const seenPenalty = personalize ? (seenPenalties.get(c.resourceId) ?? 0) : 0;
    const followScore = personalize && isFollowed ? 1 : 0;
    const trendingScore = normalize(trendingScores.get(c.resourceId) ?? 0, TRENDING_NORMALIZATION_CONSTANT);

    const score =
      freshness * w.freshness +
      trendingScore * w.trending +
      affinityScore * w.affinity +
      followScore * w.follow +
      contributorAffinityScore * w.contributorAffinity -
      seenPenalty * w.seenPenalty;

    // Featured/pin status is a card-type override, not a scoring term (see
    // ScoreBreakdown's doc comment) — recorded here as an honest note rather
    // than a fabricated point value.
    const nonScoringEffects: string[] = [];
    if (pinType === 'editors_pick') nonScoringEffects.push("Editor's Pick: card-type override, not scored.");
    else if (isFeatured) nonScoringEffects.push('Featured: card-type override, not scored.');

    return {
      resourceId: c.resourceId,
      cardType,
      score,
      authorId: c.authorId,
      categoryId: c.categoryId,
      resourceType: c.type,
      affinityScore,
      seenPenalty,
      breakdown: {
        freshness,
        trending: trendingScore,
        affinity: affinityScore,
        follow: followScore,
        contributorAffinity: contributorAffinityScore,
        seenPenalty,
        weights: w,
        nonScoringEffects,
      },
    };
  });

  // Posts are freestanding (no category/tags), so only freshness/trending
  // (via likeCount)/follow/contributor-affinity apply — affinityScore is
  // always 0, same as a resource with no category/tag overlap.
  for (const p of postCandidates) {
    const isFollowed = followingSet.has(p.authorId ?? '');
    const contributorAffinityScore = personalize ? computeContributorAffinityScore(p.authorId, affinity) : 0;
    const followScore = personalize && isFollowed ? 1 : 0;
    const freshness = freshnessScore(p.createdAt);
    const trendingScore = normalize(p.likeCount, POST_LIKE_NORMALIZATION_CONSTANT);

    const score =
      freshness * w.freshness +
      trendingScore * w.trending +
      followScore * w.follow +
      contributorAffinityScore * w.contributorAffinity;

    scored.push({
      resourceId: p.postId,
      cardType: 'user_post',
      score,
      authorId: p.authorId,
      categoryId: null,
      resourceType: 'post',
      affinityScore: 0,
      seenPenalty: 0,
      isPost: true,
      breakdown: {
        freshness,
        trending: trendingScore,
        affinity: 0,
        follow: followScore,
        contributorAffinity: contributorAffinityScore,
        seenPenalty: 0,
        weights: w,
        nonScoringEffects: [],
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const diversified = applyDiversityPass(scored, pageSize, config.diversity);
  const preDiscoveryOrder = new Map(diversified.map((c, i) => [c.resourceId, i]));
  const withDiscovery = injectDiscovery(
    diversified,
    `${userId ?? 'guest'}:${mode}:${new Date().toISOString().slice(0, 10)}`,
    config.diversity.discoveryMinInterval,
    config.diversity.discoveryMaxInterval,
  );
  // injectDiscovery only ever moves a card earlier than its ranked position
  // (see its doc comment) — a card whose index dropped was genuinely pulled
  // forward as a discovery pick, a real, derivable fact, not a fabricated one.
  withDiscovery.forEach((c, i) => {
    const priorIndex = preDiscoveryOrder.get(c.resourceId);
    if (priorIndex !== undefined && i < priorIndex) {
      c.breakdown.nonScoringEffects.push('Discovery slot: moved forward from its ranked position.');
    }
  });

  const cards: FeedCardScore[] = withDiscovery.map((c) =>
    c.isPost
      ? { resourceId: null, postId: c.resourceId, cardType: c.cardType, score: c.score, breakdown: c.breakdown }
      : { resourceId: c.resourceId, cardType: c.cardType, score: c.score, breakdown: c.breakdown },
  );

  const announcementIds = config.enabledCardTypes.includes('admin_announcement')
    ? await fetchActiveAnnouncementIds()
    : [];
  return { cards: spliceAnnouncements(cards, announcementIds) };
}

async function buildSnapshot(
  mode: FeedMode,
  userId: string | null,
  pageSize: number,
  configOverride?: FeedConfig,
): Promise<FeedSnapshot> {
  const config = configOverride ?? (await FeedSettingsService.getConfig());

  let snapshot: FeedSnapshot;
  switch (mode) {
    case 'trending':
      snapshot = await buildTrendingSnapshot();
      break;
    case 'newest':
      snapshot = await buildNewestSnapshot();
      break;
    case 'following':
      // Validated by getFeed() before this is ever called.
      snapshot = await buildFollowingSnapshot(userId as string);
      break;
    case 'for-you':
    case 'community':
      snapshot = await buildPersonalizableSnapshot(mode, userId, pageSize, config);
      break;
    default:
      snapshot = await buildNewestSnapshot();
  }

  const enabled = new Set(config.enabledCardTypes);
  return { cards: snapshot.cards.filter((c) => enabled.has(c.cardType)) };
}

export class FeedService {
  static async getFeed(
    mode: FeedMode = 'newest',
    cursorRaw: string | undefined,
    limit: number = DEFAULT_LIMIT,
    userId: string | null,
    // Only honored by the controller after a real permission check — see
    // feedController.getFeed. Adds a `score_breakdown` field per card;
    // never changes card selection/order, so it's safe to gate purely at
    // the DTO-assembly layer here.
    explain: boolean = false,
  ): Promise<{ data: unknown[]; nextCursor: string | null; mode: FeedMode }> {
    if ((mode === 'for-you' || mode === 'following') && !userId) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to view this feed.');
    }

    const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;

    let snapshotKey = makeSnapshotKey(mode, userId);
    let snapshot = cursor ? feedCache.get<FeedSnapshot>(cursor.snapshotKey) : undefined;
    let startIndex = 0;

    if (snapshot && cursor) {
      snapshotKey = cursor.snapshotKey;
      startIndex = cursor.index;
    } else {
      // No cursor (first page), or the snapshot expired mid-session — build
      // fresh and restart from index 0. The client's own seen-id dedup set
      // is the backstop against any repeats an expired-snapshot restart
      // causes.
      snapshot = await buildSnapshot(mode, userId, limit);
      feedCache.set(snapshotKey, snapshot, SNAPSHOT_TTL_MS);
    }

    const pageCards = snapshot.cards.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + pageCards.length;
    const hasMore = nextIndex < snapshot.cards.length;

    const resourceIds = pageCards
      .filter((c): c is FeedCardScore & { resourceId: string } => c.resourceId !== null)
      .map((c) => c.resourceId);
    const announcementIds = pageCards
      .filter((c): c is FeedCardScore & { announcementId: string } => Boolean(c.announcementId))
      .map((c) => c.announcementId);
    const postIds = pageCards
      .filter((c): c is FeedCardScore & { postId: string } => Boolean(c.postId))
      .map((c) => c.postId);

    const [resources, announcements, posts] = await Promise.all([
      resourceIds.length
        ? prisma.resource.findMany({ where: { id: { in: resourceIds } }, include: resourceInclude })
        : Promise.resolve([]),
      announcementIds.length
        ? prisma.feedAnnouncement.findMany({ where: { id: { in: announcementIds } } })
        : Promise.resolve([]),
      postIds.length
        ? prisma.post.findMany({ where: { id: { in: postIds } }, include: postInclude })
        : Promise.resolve([]),
    ]);
    const resourceById = new Map(resources.map((r) => [r.id, r]));
    const announcementById = new Map(announcements.map((a) => [a.id, a]));
    const postById = new Map(posts.map((p) => [p.id, p]));

    const cardDtos = await Promise.all(
      pageCards.map(async (card) => {
        if (card.cardType === 'admin_announcement') {
          const announcement = card.announcementId ? announcementById.get(card.announcementId) : undefined;
          if (!announcement) return null;
          return {
            id: `admin_announcement:${announcement.id}`,
            card_type: card.cardType,
            score: card.score,
            ...(explain ? { score_breakdown: card.breakdown ?? null } : {}),
            created_at: announcement.createdAt,
            announcement: {
              id: announcement.id,
              title: announcement.title,
              body: announcement.body,
              image_url: await StorageService.resolveUrl(announcement.imageUrl),
              link_url: announcement.linkUrl,
            },
          };
        }

        if (card.cardType === 'user_post') {
          const post = card.postId ? postById.get(card.postId) : undefined;
          if (!post || post.status !== 'visible') return null;
          return {
            id: `user_post:${post.id}`,
            card_type: card.cardType,
            score: card.score,
            ...(explain ? { score_breakdown: card.breakdown ?? null } : {}),
            created_at: post.createdAt,
            post: await toPostDto(post),
          };
        }

        if (!card.resourceId) return null;
        const resource = resourceById.get(card.resourceId);
        if (!resource) return null;
        const dto = await toResourceDto(resource as ResourceWithRelations);
        return {
          id: `${card.cardType}:${card.resourceId}`,
          card_type: card.cardType,
          score: card.score,
          ...(explain ? { score_breakdown: card.breakdown ?? null } : {}),
          created_at: resource.publishedAt ?? resource.createdAt,
          resource: dto,
        };
      }),
    );

    return {
      data: cardDtos.filter((d): d is NonNullable<typeof d> => d !== null),
      nextCursor: hasMore ? encodeCursor({ snapshotKey, index: nextIndex }) : null,
      mode,
    };
  }

  // Closes the previously-dormant seen-penalty loop: getSeenPenalties()
  // (scoring/affinity.ts) has always read these rows, nothing wrote them
  // until this method existed. One upsert per resourceId on the existing
  // (userId, type, targetKey) unique constraint — no schema change.
  static async recordImpressions(userId: string, resourceIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(resourceIds));
    await Promise.all(
      uniqueIds.map((resourceId) =>
        prisma.feedInteraction.upsert({
          where: { userId_type_targetKey: { userId, type: 'impression', targetKey: resourceId } },
          create: { userId, type: 'impression', resourceId, targetKey: resourceId, impressionCount: 1 },
          update: { impressionCount: { increment: 1 }, revokedAt: null },
        }),
      ),
    );
  }

  // Admin-only diagnostic: runs the exact same ranking code path as
  // getFeed() (buildPersonalizableSnapshot), but against a draft config and
  // never touches feedCache or FeedSettingsService — no write, no
  // persistence, no effect on any real user's feed. Always returns
  // score_breakdown since this endpoint is inherently admin-gated upstream.
  static async previewFeed(
    mode: 'community' | 'for-you',
    simulateUserId: string | null,
    configOverride: FeedConfig,
    limit: number = DEFAULT_LIMIT,
  ): Promise<{ data: unknown[] }> {
    if (mode === 'for-you' && !simulateUserId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'The "for-you" preview mode requires a persona with a user id.');
    }

    const snapshot = await buildPersonalizableSnapshot(mode, simulateUserId, limit, configOverride);
    const enabled = new Set(configOverride.enabledCardTypes);
    const pageCards = snapshot.cards.filter((c) => enabled.has(c.cardType)).slice(0, limit);

    const resourceIds = pageCards
      .filter((c): c is FeedCardScore & { resourceId: string } => c.resourceId !== null)
      .map((c) => c.resourceId);
    const postIds = pageCards.filter((c): c is FeedCardScore & { postId: string } => Boolean(c.postId)).map((c) => c.postId);
    const announcementIds = pageCards
      .filter((c): c is FeedCardScore & { announcementId: string } => Boolean(c.announcementId))
      .map((c) => c.announcementId);

    const [resources, posts, announcements] = await Promise.all([
      resourceIds.length
        ? prisma.resource.findMany({ where: { id: { in: resourceIds } }, include: resourceInclude })
        : Promise.resolve([]),
      postIds.length
        ? prisma.post.findMany({ where: { id: { in: postIds } }, include: postInclude })
        : Promise.resolve([]),
      announcementIds.length
        ? prisma.feedAnnouncement.findMany({ where: { id: { in: announcementIds } } })
        : Promise.resolve([]),
    ]);
    const resourceById = new Map(resources.map((r) => [r.id, r]));
    const postById = new Map(posts.map((p) => [p.id, p]));
    const announcementById = new Map(announcements.map((a) => [a.id, a]));

    const cardDtos = await Promise.all(
      pageCards.map(async (card) => {
        if (card.cardType === 'admin_announcement') {
          const announcement = card.announcementId ? announcementById.get(card.announcementId) : undefined;
          if (!announcement) return null;
          return {
            id: `admin_announcement:${announcement.id}`,
            card_type: card.cardType,
            score: card.score,
            score_breakdown: card.breakdown ?? null,
            created_at: announcement.createdAt,
            announcement: {
              id: announcement.id,
              title: announcement.title,
              body: announcement.body,
              image_url: await StorageService.resolveUrl(announcement.imageUrl),
              link_url: announcement.linkUrl,
            },
          };
        }
        if (card.cardType === 'user_post') {
          const post = card.postId ? postById.get(card.postId) : undefined;
          if (!post || post.status !== 'visible') return null;
          return {
            id: `user_post:${post.id}`,
            card_type: card.cardType,
            score: card.score,
            score_breakdown: card.breakdown ?? null,
            created_at: post.createdAt,
            post: await toPostDto(post),
          };
        }
        if (!card.resourceId) return null;
        const resource = resourceById.get(card.resourceId);
        if (!resource) return null;
        return {
          id: `${card.cardType}:${card.resourceId}`,
          card_type: card.cardType,
          score: card.score,
          score_breakdown: card.breakdown ?? null,
          created_at: resource.publishedAt ?? resource.createdAt,
          resource: await toResourceDto(resource as ResourceWithRelations),
        };
      }),
    );

    return { data: cardDtos.filter((d): d is NonNullable<typeof d> => d !== null) };
  }
}
