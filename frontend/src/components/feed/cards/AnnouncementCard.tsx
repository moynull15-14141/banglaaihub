import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { FeedAnnouncementSummary } from '@/types/feed';

export function AnnouncementCard({ announcement }: { announcement: FeedAnnouncementSummary }) {
  return (
    <Card className="h-full overflow-hidden border-brand/30 bg-brand/5 py-0">
      {announcement.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded/pasted URL, no fixed domain to allowlist for next/image
        <img
          src={announcement.image_url}
          alt=""
          loading="lazy"
          className="h-24 w-full object-cover sm:h-32"
        />
      ) : null}
      <CardHeader className="gap-1 pt-4">
        <Badge variant="brand" className="w-fit gap-1">
          <Megaphone className="size-3" aria-hidden="true" />
          Announcement
        </Badge>
        <h3 id={`announcement-${announcement.id}-title`} className="text-base font-semibold tracking-tight">
          {announcement.title}
        </h3>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-muted-foreground">{announcement.body}</p>
        {announcement.link_url ? (
          <Link
            href={announcement.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
          >
            Learn more
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
