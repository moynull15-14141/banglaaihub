import { Bookmark, Download, Eye } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { formatDate, formatNumber } from '@/lib/utils/format';

interface ResourceMetaProps {
  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  publishedAt: string | null;
  // Phase 4A — optional so existing callers (list cards that don't fetch
  // reviews) don't need to change.
  avgRating?: number | null;
  reviewCount?: number;
}

export function ResourceMeta({
  viewCount,
  downloadCount,
  bookmarkCount,
  publishedAt,
  avgRating,
  reviewCount,
}: ResourceMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      {avgRating != null && reviewCount ? (
        <span className="flex items-center gap-1.5" title={`${avgRating.toFixed(1)} average rating`}>
          <StarRating value={avgRating} size="sm" />
          <span>
            {avgRating.toFixed(1)} ({formatNumber(reviewCount)})
          </span>
        </span>
      ) : null}
      <span className="flex items-center gap-1" title="Views">
        <Eye className="size-4" aria-hidden="true" />
        {formatNumber(viewCount)}
      </span>
      <span className="flex items-center gap-1" title="Downloads">
        <Download className="size-4" aria-hidden="true" />
        {formatNumber(downloadCount)}
      </span>
      <span className="flex items-center gap-1" title="Bookmarks">
        <Bookmark className="size-4" aria-hidden="true" />
        {formatNumber(bookmarkCount)}
      </span>
      {publishedAt ? <span>{formatDate(publishedAt)}</span> : null}
    </div>
  );
}
