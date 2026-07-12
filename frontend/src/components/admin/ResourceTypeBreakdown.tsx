import { Folder } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STAT_CARD_ICONS, STAT_CARD_LABELS } from '@/lib/constants/resourceTypes';

const TYPE_ICONS = STAT_CARD_ICONS as Record<string, LucideIcon>;
const TYPE_LABELS = STAT_CARD_LABELS as Record<string, string>;

interface ResourceTypeBreakdownProps {
  data: Record<string, number>;
}

// A single hue, ordered by magnitude with direct value labels — this is a
// magnitude comparison across category names (already identified by their
// text label), not an identity comparison, so it needs no categorical
// palette or legend.
export function ResourceTypeBreakdown({ data }: ResourceTypeBreakdownProps) {
  const rows = Object.entries(data)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);
  const max = Math.max(1, ...rows.map(([, value]) => value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources by type</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resources yet.</p>
        ) : (
          rows.map(([type, value]) => {
            const Icon = TYPE_ICONS[type] ?? Folder;
            const width = Math.round((value / max) * 100);
            return (
              <div key={type} className="flex items-center gap-3">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="w-20 shrink-0 text-sm text-muted-foreground">
                  {TYPE_LABELS[type] ?? type}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                  {value}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
