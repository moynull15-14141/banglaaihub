'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/lib/constants/routes';
import { useNotifications } from '@/lib/hooks/useNotifications';

// Self-contained (unlike RecentDownloadsCard, which just renders data the
// dashboard endpoint already returns) — notifications have no equivalent
// field on GET /users/me/dashboard, only an unread count, so this fetches
// its own small page.
export function RecentNotificationsCard() {
  const { data } = useNotifications({ limit: 5 });
  const notifications = data?.data ?? [];

  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent notifications</CardTitle>
        <Link href={ROUTES.notifications} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <ul className="flex flex-col divide-y">
          {notifications.map((notification) => {
            const content = (
              <>
                <div className="flex min-w-0 items-center gap-2">
                  {!notification.is_read ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  ) : null}
                  <span className="min-w-0 truncate text-sm font-medium">{notification.title}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </>
            );

            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link
                    href={notification.link}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-muted/50"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
