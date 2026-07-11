import { StarRating } from '@/components/ui/star-rating';
import type { RatingSummary as RatingSummaryData } from '@/types/review';

interface RatingSummaryProps {
  summary: RatingSummaryData;
}

export function RatingSummary({ summary }: RatingSummaryProps) {
  const { avg_rating, review_count, distribution } = summary;

  if (review_count === 0 || avg_rating == null) {
    return <p className="text-sm text-muted-foreground">No reviews yet — be the first to review.</p>;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-col items-start gap-1">
        <span className="text-3xl font-bold">{avg_rating.toFixed(1)}</span>
        <StarRating value={avg_rating} size="md" />
        <span className="text-xs text-muted-foreground">
          {review_count} review{review_count === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[String(star) as '1' | '2' | '3' | '4' | '5'];
          const pct = review_count > 0 ? Math.round((count / review_count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 text-right">{star}★</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
