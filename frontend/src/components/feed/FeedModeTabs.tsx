'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedList } from '@/components/feed/FeedList';
import { useAuth } from '@/lib/hooks/useAuth';
import type { FeedMode } from '@/types/feed';

// For You/Following need a signed-in user (the backend 401s otherwise) —
// hidden for guests rather than shown disabled, since there's nothing useful
// to preview behind them. Community is the non-personalized default logged
// out users land on; For You is the default once signed in.
const GUEST_MODES: { value: FeedMode; label: string }[] = [
  { value: 'community', label: 'Community' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
];

const AUTHENTICATED_MODES: { value: FeedMode; label: string }[] = [
  { value: 'for-you', label: 'For You' },
  { value: 'following', label: 'Following' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
];

export function FeedModeTabs() {
  const { isAuthenticated, isInitialized } = useAuth();

  // Avoid flashing the guest tab set (and its default tab) for a fraction of
  // a second while the auth store hydrates from storage on first load.
  if (!isInitialized) {
    return null;
  }

  const modes = isAuthenticated ? AUTHENTICATED_MODES : GUEST_MODES;
  const defaultMode = isAuthenticated ? 'for-you' : 'community';

  return (
    <Tabs defaultValue={defaultMode}>
      <TabsList>
        {modes.map((mode) => (
          <TabsTrigger key={mode.value} value={mode.value}>
            {mode.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {modes.map((mode) => (
        <TabsContent key={mode.value} value={mode.value} className="pt-4">
          <FeedList mode={mode.value} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
