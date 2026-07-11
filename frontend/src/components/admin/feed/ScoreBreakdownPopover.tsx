'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FeedScoreBreakdown } from '@/types/feed';

const FACTOR_LABELS: { key: keyof FeedScoreBreakdown['weights']; label: string }[] = [
  { key: 'freshness', label: 'Freshness' },
  { key: 'trending', label: 'Trending' },
  { key: 'affinity', label: 'Affinity' },
  { key: 'follow', label: 'Follow' },
  { key: 'contributorAffinity', label: 'Contributor affinity' },
  { key: 'seenPenalty', label: 'Seen penalty' },
];

function contribution(breakdown: FeedScoreBreakdown, key: keyof FeedScoreBreakdown['weights']): number {
  const raw = breakdown[key];
  const weight = breakdown.weights[key];
  const signed = raw * weight;
  return key === 'seenPenalty' ? -signed : signed;
}

// Admin-only "Why am I seeing this?" breakdown. Every number here comes
// straight from the real ranking formula (feed.service.ts) — Featured/pin
// and Discovery-slot are deliberately NOT given fabricated point values
// since they aren't scoring terms today; see nonScoringEffects instead.
export function ScoreBreakdownPopover({ score, breakdown }: { score: number; breakdown: FeedScoreBreakdown }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 size-7 rounded-full bg-background/80 backdrop-blur-sm"
          aria-label="Why am I seeing this?"
        >
          <Info className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h4 className="text-sm font-semibold">Why this card?</h4>
        <dl className="mt-3 space-y-1.5 text-sm">
          {FACTOR_LABELS.map(({ key, label }) => {
            const value = contribution(breakdown, key);
            return (
              <div key={key} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={`tabular-nums ${value < 0 ? 'text-destructive' : ''}`}>
                  {value >= 0 ? '+' : ''}
                  {value.toFixed(3)}
                </dd>
              </div>
            );
          })}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 font-semibold">
            <dt>Final score</dt>
            <dd className="tabular-nums">{score.toFixed(3)}</dd>
          </div>
        </dl>
        {breakdown.nonScoringEffects.length > 0 ? (
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {breakdown.nonScoringEffects.map((effect) => (
              <p key={effect}>{effect}</p>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
