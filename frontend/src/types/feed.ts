import type { Resource } from '@/types/resource';
import type { Post } from '@/types/post';

// Mirrors backend/src/validators/feed.validator.ts's FEED_MODES.
// `for-you`/`following` require authentication (the backend 401s otherwise).
export type FeedMode = 'newest' | 'trending' | 'for-you' | 'following' | 'community';

// Mirrors backend/src/validators/feed.validator.ts's FEED_CARD_TYPES — every
// card type feed.service.ts can actually produce. The Prisma schema's
// FeedCardType enum has more values reserved for stubbed-out future work
// (collection_shared, event_upcoming, sponsored_content) not listed here.
export type FeedCardType =
  | 'resource_published'
  | 'featured_resource'
  | 'trending_resource'
  | 'follow_activity'
  | 'editors_pick'
  | 'admin_announcement'
  | 'user_post';

export interface FeedAnnouncementSummary {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
}

// Only present when the feed was fetched with ?explain=true AND the
// requester has admin:manage (silently omitted otherwise — see
// feedController.getFeed). Featured/Discovery are deliberately absent as
// numeric terms — they're not scoring factors, see nonScoringEffects.
export interface FeedScoreBreakdown {
  freshness: number;
  trending: number;
  affinity: number;
  follow: number;
  contributorAffinity: number;
  seenPenalty: number;
  weights: {
    freshness: number;
    trending: number;
    affinity: number;
    follow: number;
    contributorAffinity: number;
    seenPenalty: number;
  };
  nonScoringEffects: string[];
}

interface BaseFeedCard {
  id: string;
  score: number;
  score_breakdown?: FeedScoreBreakdown | null;
  created_at: string;
}

// Every card type except admin_announcement/user_post is resource-backed.
export interface ResourceFeedCard extends BaseFeedCard {
  card_type: 'resource_published' | 'featured_resource' | 'trending_resource' | 'follow_activity' | 'editors_pick';
  resource: Resource;
}

export interface AnnouncementFeedCard extends BaseFeedCard {
  card_type: 'admin_announcement';
  announcement: FeedAnnouncementSummary;
}

export interface UserPostFeedCard extends BaseFeedCard {
  card_type: 'user_post';
  post: Post;
}

export type FeedCard = ResourceFeedCard | AnnouncementFeedCard | UserPostFeedCard;

export interface ListFeedParams {
  mode?: FeedMode;
  cursor?: string;
  limit?: number;
  // Admin-only diagnostic flag — see FeedScoreBreakdown's doc comment.
  explain?: boolean;
}
