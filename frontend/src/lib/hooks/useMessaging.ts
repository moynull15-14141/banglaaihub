'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  blockUser,
  getConversationMessages,
  getUnreadMessageCount,
  listConversations,
  markConversationRead,
  sendMessageInConversation,
  sendMessageToUser,
} from '@/lib/api/messaging';
import { useAuth } from '@/lib/hooks/useAuth';

const CONVERSATIONS_KEY = ['messages', 'conversations'];
const UNREAD_COUNT_KEY = ['messages', 'unread-count'];
const THREAD_POLL_MS = 4000;
const UNREAD_POLL_MS = 15000;

// Polling, not WebSocket (see project-planning/10-database-design.md §32) —
// refetchInterval keeps the widget "live enough" without a realtime server.
export function useUnreadMessageCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadMessageCount,
    enabled: isAuthenticated,
    refetchInterval: UNREAD_POLL_MS,
  });
}

export function useConversations(enabled: boolean) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => listConversations({ limit: 30 }),
    enabled: isAuthenticated && enabled,
    refetchInterval: enabled ? UNREAD_POLL_MS : false,
  });
}

export function useConversationMessages(conversationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['messages', 'thread', conversationId],
    queryFn: () => getConversationMessages(conversationId as string, { limit: 50 }),
    enabled: enabled && Boolean(conversationId),
    refetchInterval: enabled && conversationId ? THREAD_POLL_MS : false,
  });
}

export function useSendMessageToUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, content }: { username: string; content: string }) => sendMessageToUser(username, content),
    onSuccess: (message) => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', message.conversation_id] });
    },
  });
}

export function useSendMessageInConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendMessageInConversation(conversationId, content),
    onSuccess: (message) => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'thread', message.conversation_id] });
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => markConversationRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useBlockUser() {
  return useMutation({ mutationFn: (username: string) => blockUser(username) });
}
