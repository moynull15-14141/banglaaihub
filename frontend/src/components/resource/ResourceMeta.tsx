import { Bookmark, Download, Eye } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils/format';

interface ResourceMetaProps {
  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  publishedAt: string | null;
}

export function ResourceMeta({
  viewCount,
  downloadCount,
  bookmarkCount,
  publishedAt,
}: ResourceMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
