'use client';

import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserAvatar } from '@/components/user/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { useConversations } from '@/lib/hooks/useMessaging';
import { useMessagingDockStore } from '@/lib/store/messagingDockStore';
import { formatRelativeDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

export function ConversationListPanel() {
  const { data, isLoading, isError, refetch } = useConversations(true);
  const openThreadWithConversation = useMessagingDockStore((state) => state.openThreadWithConversation);

  const conversations = data?.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2.5">
        <h2 className="px-1 text-sm font-semibold">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-center text-xs text-muted-foreground">Loading…</p>
        ) : isError ? (
          <ErrorState title="Couldn't load conversations" onRetry={() => void refetch()} />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Message someone from their profile to start chatting."
          />
        ) : (
          <ul>
            {conversations.map((conversation) => {
              const name = conversation.other_participant.display_name ?? conversation.other_participant.username;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 border-b border-border/60 p-2.5 text-left hover:bg-muted/60"
                    onClick={() => openThreadWithConversation(conversation.id, conversation.other_participant)}
                  >
                    <UserAvatar avatarUrl={conversation.other_participant.avatar_url} name={name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn('truncate text-sm', conversation.unread_count > 0 && 'font-semibold')}
                        >
                          {name}
                        </p>
                        {conversation.last_message_at ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatRelativeDate(conversation.last_message_at)}
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'truncate text-xs',
                          conversation.unread_count > 0
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {conversation.last_message?.content ?? 'Say hello!'}
                      </p>
                    </div>
                    {conversation.unread_count > 0 ? (
                      <Badge variant="brand" className="h-4 min-w-4 px-1 text-[10px]">
                        {conversation.unread_count}
                      </Badge>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
