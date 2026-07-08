'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import type { ListNotificationsParams } from '@/types/notification';

const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications(params: ListNotificationsParams = {}) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: () => listNotifications(params),
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    // The dashboard's unread-notification badge is a separate query — keep
    // it in sync with whatever just changed here.
    void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'dashboard'] });
  };
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: invalidate,
  });
}
