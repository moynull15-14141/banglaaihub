'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { ROUTES } from '@/lib/constants/routes';

const UNREAD_POLL_INTERVAL_MS = 30_000;
const UNREAD_DISPLAY_CAP = 16;

export function NotificationBell() {
  const { data } = useNotifications(
    { unread: true, limit: 1 },
    { refetchInterval: UNREAD_POLL_INTERVAL_MS },
  );
  const unreadCount = data?.meta.unread_count ?? 0;

  return (
    <Link
      href={ROUTES.notifications}
      className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
    >
      <Bell className="size-5" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-destructive-foreground"
          aria-hidden="true"
        >
          {unreadCount > UNREAD_DISPLAY_CAP ? `${UNREAD_DISPLAY_CAP}+` : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
