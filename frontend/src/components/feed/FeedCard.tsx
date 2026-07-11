import { Flame, Sparkles, UserRoundCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ResourceCard } from '@/components/resource/ResourceCard';
import { AnnouncementCard } from '@/components/feed/cards/AnnouncementCard';
import { UserPostCard } from '@/components/feed/cards/UserPostCard';
import { ScoreBreakdownPopover } from '@/components/admin/feed/ScoreBreakdownPopover';
import { useImpressionObserver } from '@/lib/hooks/useImpressionTracking';
import type { FeedCard as FeedCardData, ResourceFeedCard } from '@/types/feed';

// Resource-backed card types get the existing ResourceCard (bookmark/like/
// status logic reused wholesale) with a thin ribbon rather than
// reimplementing resource rendering. admin_announcement and user_post are
// the non-resource card types and get their own small components.
const RIBBON: Partial<Record<ResourceFeedCard['card_type'], { label: string; icon: typeof Flame }>> = {
  trending_resource: { label: 'Trending', icon: Flame },
  featured_resource: { label: 'Featured', icon: Sparkles },
  editors_pick: { label: "Editor's Pick", icon: Sparkles },
  follow_activity: { label: 'Following', icon: UserRoundCheck },
};

export function FeedCard({ card }: { card: FeedCardData }) {
  // Called unconditionally (rules-of-hooks) — resolves to null for the two
  // non-resource card types below, which the hook itself treats as a no-op.
  const impressionRef = useImpressionObserver(
    card.card_type === 'admin_announcement' || card.card_type === 'user_post' ? null : card.resource.id,
  );

  if (card.card_type === 'admin_announcement') {
    return (
      <article aria-labelledby={`announcement-${card.announcement.id}-title`}>
        <AnnouncementCard announcement={card.announcement} />
      </article>
    );
  }

  if (card.card_type === 'user_post') {
    return (
      <article aria-label={card.post.author ? `Post by ${card.post.author.username}` : 'Post'}>
        <UserPostCard post={card.post} />
      </article>
    );
  }

  const ribbon = RIBBON[card.card_type];

  return (
    <article aria-label={card.resource.title} className="relative" ref={impressionRef}>
      {ribbon ? (
        <Badge variant="brand" className="absolute top-2 left-2 z-10 gap-1 shadow-sm">
          <ribbon.icon className="size-3" aria-hidden="true" />
          {ribbon.label}
        </Badge>
      ) : null}
      {card.score_breakdown ? (
        <ScoreBreakdownPopover score={card.score} breakdown={card.score_breakdown} />
      ) : null}
      <ResourceCard resource={card.resource} />
    </article>
  );
}
