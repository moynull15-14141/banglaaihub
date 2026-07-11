'use client';

import { toast } from 'sonner';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useFeedConfigHistory, useRollbackFeedConfig } from '@/lib/hooks/useFeedAdmin';

const WEIGHT_LABELS: Record<string, string> = {
  freshness: 'Freshness',
  trending: 'Trending',
  affinity: 'Affinity',
  follow: 'Follow',
  contributor_affinity: 'Contributor affinity',
  seen_penalty: 'Seen penalty',
};

function describeWeightDiff(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): string[] {
  const oldWeights = (oldValue?.weights ?? {}) as Record<string, number>;
  const newWeights = (newValue?.weights ?? {}) as Record<string, number>;
  const changes: string[] = [];
  for (const key of Object.keys(WEIGHT_LABELS)) {
    const before = oldWeights[key];
    const after = newWeights[key];
    if (before !== undefined && after !== undefined && before !== after) {
      changes.push(`${WEIGHT_LABELS[key]}: ${before} → ${after}`);
    }
  }
  return changes;
}

// Lists via the existing GET /admin/audit-logs?target_type=feed_config —
// no bespoke history-listing endpoint (see listFeedConfigHistoryAdmin).
// "Never overwrite history": rollback replays an old snapshot through the
// normal save path, which itself creates a brand-new entry here.
export function FeedConfigHistory() {
  const { data, isLoading } = useFeedConfigHistory();
  const rollbackMutation = useRollbackFeedConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">Configuration History</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Every saved change to ranking weights, diversity, and enabled card types.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>
        ) : !data || data.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.data.map((entry) => {
              const changes = describeWeightDiff(entry.old_value, entry.new_value);
              const reason = entry.new_value?.reason as string | null | undefined;
              return (
                <li key={entry.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium">{entry.actor?.display_name ?? entry.actor?.username ?? 'Unknown'}</span>
                      <span className="text-muted-foreground"> · {new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={rollbackMutation.isPending}
                      onClick={() =>
                        rollbackMutation.mutate(entry.id, {
                          onSuccess: () => toast.success('Rolled back to this version.'),
                          onError: () => toast.error('Could not roll back to this version.'),
                        })
                      }
                    >
                      Rollback to this version
                    </Button>
                  </div>
                  {reason ? <p className="text-sm text-muted-foreground">&ldquo;{reason}&rdquo;</p> : null}
                  {changes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {changes.map((change) => (
                        <Badge key={change} variant="outline" className="font-normal">
                          {change}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Diversity / card-type change only.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
