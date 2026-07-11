'use client';

import { MessageCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConversationListPanel } from '@/components/messaging/ConversationListPanel';
import { ChatThreadPanel } from '@/components/messaging/ChatThreadPanel';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUnreadMessageCount } from '@/lib/hooks/useMessaging';
import { useMessagingDockStore } from '@/lib/store/messagingDockStore';

// LinkedIn-style floating chat dock — a collapsed tab bottom-right that
// slides a small panel up when opened, mounted once (globally, in
// Providers) rather than per-page. Polling-based, not WebSocket; see
// project-planning/10-database-design.md §32.
export function MessagingDock() {
  const { isAuthenticated, isInitialized } = useAuth();
  const isOpen = useMessagingDockStore((state) => state.isOpen);
  const view = useMessagingDockStore((state) => state.view);
  const toggle = useMessagingDockStore((state) => state.toggle);
  const { data: unreadCount } = useUnreadMessageCount();

  if (!isInitialized || !isAuthenticated) return null;

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end sm:right-6">
      {isOpen ? (
        <div className="mb-2 h-[420px] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:w-[360px]">
          {view === 'thread' ? <ChatThreadPanel /> : <ConversationListPanel />}
        </div>
      ) : null}

      <Button
        type="button"
        variant="default"
        className="h-11 gap-2 rounded-full px-4 shadow-lg"
        onClick={toggle}
        aria-label={isOpen ? 'Close messages' : 'Open messages'}
      >
        {isOpen ? <X className="size-4" aria-hidden="true" /> : <MessageCircle className="size-4" aria-hidden="true" />}
        Messages
        {!isOpen && unreadCount ? (
          <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
            {unreadCount}
          </Badge>
        ) : null}
      </Button>
    </div>
  );
}
