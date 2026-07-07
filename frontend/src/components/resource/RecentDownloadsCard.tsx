import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { resourceHref } from '@/lib/constants/routes';
import type { RecentDownload } from '@/types/dashboard';

interface RecentDownloadsCardProps {
  downloads: RecentDownload[];
}

// Purely a rendering of GET /users/me/dashboard's recent_downloads field —
// no separate API call, the dashboard endpoint already includes it.
export function RecentDownloadsCard({ downloads }: RecentDownloadsCardProps) {
  if (downloads.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent downloads</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <ul className="flex flex-col divide-y">
          {downloads.map((download, index) => (
            <li key={`${download.resource.id}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={resourceHref(download.resource.type, download.resource.slug)}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {download.resource.title}
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {RESOURCE_TYPE_LABELS[download.resource.type] ?? download.resource.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(download.downloaded_at), { addSuffix: true })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
