'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/notification';

function NotificationRow({ notification }: { notification: Notification }) {
  const markReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border border-border/60 p-4',
        !notification.is_read && 'border-brand/30 bg-brand/5',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!notification.is_read ? (
            <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
          ) : null}
          {notification.link ? (
            <Link href={notification.link} className="truncate text-sm font-medium hover:underline">
              {notification.title}
            </Link>
          ) : (
            <span className="truncate text-sm font-medium">{notification.title}</span>
          )}
        </div>
        {notification.message ? (
          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
        ) : null}
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!notification.is_read ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Mark as read"
            disabled={markReadMutation.isPending}
            onClick={() => markReadMutation.mutate(notification.id)}
          >
            <Check className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete notification"
          disabled={deleteMutation.isPending}
          onClick={() => {
            deleteMutation.mutate(notification.id, {
              onError: () => toast.error('Could not delete this notification.'),
            });
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationsView() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { page, limit, setPage, reset } = usePagination({ initialLimit: 20 });

  const { data, isLoading, isError, refetch } = useNotifications({
    unread: filter === 'unread' ? true : undefined,
    page,
    limit,
  });
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta.unread_count ?? 0;

  function handleFilterChange(value: string) {
    setFilter(value as 'all' | 'unread');
    reset();
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader
          title="Notifications"
          description="Updates about your submissions and community activity."
        />
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markAllReadMutation.isPending}
            onClick={() => {
              markAllReadMutation.mutate(undefined, {
                onSuccess: () => toast.success('All notifications marked as read.'),
                onError: () => toast.error('Could not mark all as read.'),
              });
            }}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>

      <Tabs value={filter} onValueChange={handleFilterChange} className="mt-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load notifications" onRetry={() => void refetch()} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={filter === 'unread' ? BellOff : Bell}
            title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
            description={
              filter === 'unread'
                ? 'No unread notifications right now.'
                : 'Updates about your submissions and community activity will show up here.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        )}

        {data ? (
          <Pagination page={page} limit={data.meta.limit ?? limit} total={data.meta.total ?? 0} onPageChange={setPage} />
        ) : null}
      </div>
    </PageContainer>
  );
}
