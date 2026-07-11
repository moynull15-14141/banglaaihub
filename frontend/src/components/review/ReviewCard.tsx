'use client';

import { BadgeCheck, Flag, ThumbsUp, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { UserAvatar } from '@/components/user/UserAvatar';
import { formatDate } from '@/lib/utils/format';
import type { Review } from '@/types/review';

interface ReviewCardProps {
  review: Review;
  isOwn: boolean;
  canModerate: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleHelpful: () => void;
  onReport: () => void;
  isHelpfulPending: boolean;
  isDeletePending: boolean;
}

export function ReviewCard({
  review,
  isOwn,
  canModerate,
  onEdit,
  onDelete,
  onToggleHelpful,
  onReport,
  isHelpfulPending,
  isDeletePending,
}: ReviewCardProps) {
  const authorName = review.author?.display_name ?? review.author?.username ?? 'Unknown';

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar avatarUrl={review.author?.avatar_url} name={authorName} size="sm" />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              {authorName}
              {review.author?.is_verified ? (
                <BadgeCheck className="size-3.5 text-brand" aria-label="Verified contributor" />
              ) : null}
            </div>
            <StarRating value={review.rating} size="sm" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
      </div>

      {review.title ? <p className="font-medium">{review.title}</p> : null}
      {review.body ? <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p> : null}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant={review.is_marked_helpful ? 'secondary' : 'ghost'}
          size="sm"
          disabled={isHelpfulPending || isOwn}
          onClick={onToggleHelpful}
        >
          <ThumbsUp className="size-3.5" aria-hidden="true" />
          Helpful ({review.helpful_count})
        </Button>

        {isOwn ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isDeletePending}>
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onReport}>
              <Flag className="size-3.5" aria-hidden="true" />
              Report
            </Button>
            {canModerate ? (
              <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isDeletePending}>
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {isOwn ? <Badge variant="outline">Your review</Badge> : null}
    </div>
  );
}
