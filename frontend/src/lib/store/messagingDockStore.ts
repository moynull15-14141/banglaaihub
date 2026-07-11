import { create } from 'zustand';
import type { MessagingUser } from '@/types/messaging';

type DockView = 'list' | 'thread';

interface MessagingDockState {
  isOpen: boolean;
  view: DockView;
  // Known once a conversation actually exists — null when a thread was just
  // opened via "Message" on a profile and no message has been sent yet.
  activeConversationId: string | null;
  activeUser: MessagingUser | null;

  openList: () => void;
  openThreadWithConversation: (conversationId: string, otherUser: MessagingUser) => void;
  openThreadWithUser: (user: MessagingUser) => void;
  setActiveConversationId: (id: string) => void;
  close: () => void;
  toggle: () => void;
}

// Global floating chat dock state (LinkedIn-style bottom-right widget) — a
// store rather than React context because the trigger (ProfileHeader's
// Message button) and the dock itself (mounted once in Providers) live in
// unrelated component trees with no shared ancestor to host context in.
export const useMessagingDockStore = create<MessagingDockState>((set) => ({
  isOpen: false,
  view: 'list',
  activeConversationId: null,
  activeUser: null,

  openList: () => set({ isOpen: true, view: 'list' }),
  openThreadWithConversation: (conversationId, otherUser) =>
    set({ isOpen: true, view: 'thread', activeConversationId: conversationId, activeUser: otherUser }),
  openThreadWithUser: (user) => set({ isOpen: true, view: 'thread', activeConversationId: null, activeUser: user }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
