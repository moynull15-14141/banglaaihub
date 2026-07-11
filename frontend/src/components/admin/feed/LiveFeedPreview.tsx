'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FeedCard } from '@/components/feed/FeedCard';
import { usePreviewFeed } from '@/lib/hooks/useFeedAdmin';
import { useFeedConfigDraftStore } from '@/lib/store/feedConfigDraftStore';
import { FEED_PREVIEW_PERSONAS, type FeedPreviewPersona } from '@/types/feed-admin';

const PERSONA_LABELS: Record<FeedPreviewPersona, string> = {
  anonymous: 'Anonymous',
  new_user: 'New user',
  regular: 'Regular user',
  contributor: 'Contributor',
  power_user: 'Power user',
  admin: 'Admin',
};

const PREVIEW_DEBOUNCE_MS = 400;

// Runs the REAL ranking engine (buildPersonalizableSnapshot, same code path
// as production) against the admin's in-progress, unsaved weight/diversity
// edits — see feedConfigDraftStore.ts. Never writes to the database; the
// backend endpoint bypasses both FeedSettingsService.getConfig() and
// feedCache entirely (see FeedService.previewFeed).
export function LiveFeedPreview() {
  const weights = useFeedConfigDraftStore((s) => s.weights);
  const diversity = useFeedConfigDraftStore((s) => s.diversity);
  const enabledCardTypes = useFeedConfigDraftStore((s) => s.enabledCardTypes);

  const [persona, setPersona] = useState<FeedPreviewPersona>('regular');
  const [mode, setMode] = useState<'community' | 'for-you'>('for-you');
  const previewMutation = usePreviewFeed();

  useEffect(() => {
    if (!weights || !diversity || !enabledCardTypes) return;

    const timer = setTimeout(() => {
      previewMutation.mutate({
        mode,
        persona,
        config: { weights, diversity, enabled_card_types: enabledCardTypes },
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // previewMutation is intentionally excluded: React Query mutation hooks
    // return a fresh object every render, so including it would re-fire
    // this effect on every render instead of only on actual draft/persona/
    // mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weights, diversity, enabledCardTypes, persona, mode]);

  if (!weights || !diversity || !enabledCardTypes) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">Live Preview</h2>
          <Badge variant="outline" className="ml-auto">
            Preview only — not saved
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Reflects your unsaved edits above, ranked by the real engine against a real user&apos;s history. Nothing
          here is written to the database or shown to real users.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FEED_PREVIEW_PERSONAS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={persona === p ? 'default' : 'outline'}
              onClick={() => setPersona(p)}
              disabled={p === 'anonymous' && mode === 'for-you'}
            >
              {PERSONA_LABELS[p]}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 border-t border-border pt-4">
          {(['for-you', 'community'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? 'default' : 'outline'}
              onClick={() => {
                setMode(m);
                if (m === 'for-you' && persona === 'anonymous') setPersona('regular');
              }}
            >
              {m === 'for-you' ? 'For You' : 'Community'}
            </Button>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          {previewMutation.isPending ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Recalculating…</p>
          ) : previewMutation.isError ? (
            <p className="py-6 text-center text-sm text-destructive">Could not load the preview.</p>
          ) : previewMutation.data && previewMutation.data.cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {previewMutation.data.cards.map((card) => (
                <FeedCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Adjust a weight above to see a live preview.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
