'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, MoreVertical, Send, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/constants/routes';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  useBlockUser,
  useConversationMessages,
  useMarkConversationRead,
  useSendMessageInConversation,
  useSendMessageToUser,
} from '@/lib/hooks/useMessaging';
import { useMessagingDockStore } from '@/lib/store/messagingDockStore';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils/format';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

export function ChatThreadPanel() {
  const { user } = useAuth();
  const activeConversationId = useMessagingDockStore((state) => state.activeConversationId);
  const activeUser = useMessagingDockStore((state) => state.activeUser);
  const setActiveConversationId = useMessagingDockStore((state) => state.setActiveConversationId);
  const openList = useMessagingDockStore((state) => state.openList);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useConversationMessages(activeConversationId, true);
  const sendToUserMutation = useSendMessageToUser();
  const sendInConversationMutation = useSendMessageInConversation();
  const markReadMutation = useMarkConversationRead();
  const blockMutation = useBlockUser();

  const isSending = sendToUserMutation.isPending || sendInConversationMutation.isPending;
  const messages = data?.data ?? [];

  useEffect(() => {
    if (activeConversationId) markReadMutation.mutate(activeConversationId);
    // Only re-run when the thread actually changes, not on every poll refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  if (!activeUser) return null;
  const otherName = activeUser.display_name ?? activeUser.username;

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');

    if (activeConversationId) {
      sendInConversationMutation.mutate(
        { conversationId: activeConversationId, content: trimmed },
        { onError: (error) => toast.error(errorMessage(error, 'Could not send this message.')) },
      );
      return;
    }

    sendToUserMutation.mutate(
      { username: activeUser!.username, content: trimmed },
      {
        onSuccess: (message) => setActiveConversationId(message.conversation_id),
        onError: (error) => toast.error(errorMessage(error, 'Could not send this message.')),
      },
    );
  }

  function handleBlock() {
    blockMutation.mutate(activeUser!.username, {
      onSuccess: () => {
        toast.success(`Blocked @${activeUser!.username}.`);
        openList();
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not block this user.')),
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2.5">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Back to conversations" onClick={openList}>
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <Link href={ROUTES.userProfile(activeUser.username)} className="flex min-w-0 flex-1 items-center gap-2">
          <UserAvatar avatarUrl={activeUser.avatar_url} name={otherName} size="sm" />
          <span className="truncate text-sm font-medium">{otherName}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Conversation options">
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={handleBlock}>
              <ShieldOff className="size-4" aria-hidden="true" />
              Block @{activeUser.username}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && activeConversationId ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Say hello to {otherName} — this is the start of your conversation.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === user?.id;
            return (
              <div key={message.id} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-1.5 text-sm whitespace-pre-wrap',
                    isMine ? 'bg-brand text-brand-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {message.content}
                </div>
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatRelativeDate(message.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message…"
          disabled={isSending}
        />
        <Button type="button" size="icon-sm" aria-label="Send" disabled={!draft.trim() || isSending} onClick={handleSend}>
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
