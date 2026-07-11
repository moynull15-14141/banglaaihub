'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessagingDockStore } from '@/lib/store/messagingDockStore';
import type { MessagingUser } from '@/types/messaging';

export function MessageButton({ user }: { user: MessagingUser }) {
  const openThreadWithUser = useMessagingDockStore((state) => state.openThreadWithUser);

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => openThreadWithUser(user)}>
      <MessageCircle className="size-4" aria-hidden="true" />
      Message
    </Button>
  );
}
