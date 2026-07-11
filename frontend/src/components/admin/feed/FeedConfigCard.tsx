'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useFeedConfig, useUpdateFeedConfig } from '@/lib/hooks/useFeedAdmin';
import { useFeedConfigDraftStore } from '@/lib/store/feedConfigDraftStore';
import type { FeedCardType } from '@/types/feed';
import type { FeedDiversityConfig, FeedWeights } from '@/types/feed-admin';

const WEIGHT_FIELDS: { key: keyof FeedWeights; label: string; hint: string }[] = [
  { key: 'freshness', label: 'Freshness', hint: 'How much newer content outranks older content.' },
  { key: 'trending', label: 'Trending', hint: 'Recent downloads/likes/comments/views.' },
  { key: 'affinity', label: 'Affinity', hint: "Match to a user's own category/tag history." },
  { key: 'follow', label: 'Follow', hint: 'Bonus for resources from followed contributors.' },
  { key: 'contributor_affinity', label: 'Contributor affinity', hint: "Match to a user's engagement history with an author." },
  { key: 'seen_penalty', label: 'Seen penalty', hint: 'How strongly repeat impressions are pushed down.' },
];

const DIVERSITY_FIELDS: { key: keyof FeedDiversityConfig; label: string }[] = [
  { key: 'max_per_contributor', label: 'Max per contributor / page' },
  { key: 'max_per_category', label: 'Max per category / page' },
  { key: 'max_per_type', label: 'Max per resource type / page' },
  { key: 'discovery_min_interval', label: 'Discovery: min interval' },
  { key: 'discovery_max_interval', label: 'Discovery: max interval' },
];

const CARD_TYPE_LABELS: Record<FeedCardType, string> = {
  resource_published: 'Resource published',
  featured_resource: 'Featured resource',
  trending_resource: 'Trending resource',
  follow_activity: 'Follow activity',
  editors_pick: "Editor's pick",
  admin_announcement: 'Admin announcement',
  user_post: 'User post',
};

export function FeedConfigCard() {
  const { data: config, isLoading } = useFeedConfig();
  const updateMutation = useUpdateFeedConfig();

  // Draft state lives in a shared store (not local useState) so
  // LiveFeedPreview.tsx can watch these exact in-progress, unsaved edits —
  // see feedConfigDraftStore.ts's doc comment.
  const weights = useFeedConfigDraftStore((s) => s.weights);
  const diversity = useFeedConfigDraftStore((s) => s.diversity);
  const enabledCardTypes = useFeedConfigDraftStore((s) => s.enabledCardTypes);
  const reason = useFeedConfigDraftStore((s) => s.reason);
  const setWeights = useFeedConfigDraftStore((s) => s.setWeights);
  const setDiversity = useFeedConfigDraftStore((s) => s.setDiversity);
  const setEnabledCardTypes = useFeedConfigDraftStore((s) => s.setEnabledCardTypes);
  const setReason = useFeedConfigDraftStore((s) => s.setReason);
  const syncFromServer = useFeedConfigDraftStore((s) => s.syncFromServer);

  useEffect(() => {
    if (config) syncFromServer(config);
  }, [config, syncFromServer]);

  if (isLoading || !weights || !diversity || !enabledCardTypes) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading feed configuration…</CardContent>
      </Card>
    );
  }

  function toggleCardType(type: FeedCardType, enabled: boolean) {
    const current = enabledCardTypes ?? [];
    setEnabledCardTypes(enabled ? [...current, type] : current.filter((t) => t !== type));
  }

  function handleSave() {
    if (!weights || !diversity || !enabledCardTypes) return;
    updateMutation.mutate(
      { weights, diversity, enabled_card_types: enabledCardTypes, reason: reason.trim() || undefined },
      {
        onSuccess: () => toast.success('Feed configuration saved.'),
        onError: () => toast.error('Could not save the feed configuration.'),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold tracking-tight">Ranking weights</h2>
        <p className="text-sm text-muted-foreground">
          Adjust how each signal contributes to a card&apos;s score in the For You / Community feeds.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-5">
          {WEIGHT_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>{field.label}</Label>
                <span className="text-sm tabular-nums text-muted-foreground">{weights[field.key].toFixed(1)}</span>
              </div>
              <Slider
                min={0}
                max={5}
                step={0.1}
                value={[weights[field.key]]}
                onValueChange={([value]) => setWeights({ ...weights, [field.key]: value })}
              />
              <p className="text-xs text-muted-foreground">{field.hint}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Diversity & discovery</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DIVERSITY_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`diversity-${field.key}`} className="text-xs">
                  {field.label}
                </Label>
                <Input
                  id={`diversity-${field.key}`}
                  type="number"
                  min={1}
                  max={50}
                  value={diversity[field.key]}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(value)) return;
                    setDiversity({ ...diversity, [field.key]: value });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold">Card types</h3>
          <div className="mt-3 space-y-2">
            {(Object.keys(CARD_TYPE_LABELS) as FeedCardType[]).map((type) => (
              <div key={type} className="flex items-center justify-between gap-2">
                <Label htmlFor={`card-type-${type}`} className="font-normal">
                  {CARD_TYPE_LABELS[type]}
                </Label>
                <Switch
                  id={`card-type-${type}`}
                  checked={enabledCardTypes.includes(type)}
                  onCheckedChange={(checked) => toggleCardType(type, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 border-t border-border pt-5">
          <Label htmlFor="feed-config-reason" className="text-xs">
            Reason for this change (optional)
          </Label>
          <Textarea
            id="feed-config-reason"
            placeholder="e.g. Boosting discovery ahead of the launch campaign"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Recorded in Configuration History below.</p>
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
