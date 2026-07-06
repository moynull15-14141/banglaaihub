import { CheckCircle2, Clock, Flag, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ResourceStatusBreakdownProps {
  data: Record<string, number>;
}

// Status is a fixed, reserved encoding (never a categorical series) — each
// row pairs an icon and a label with its color so status is never
// communicated by color alone.
const STATUS_META = [
  { key: 'approved', label: 'Approved', icon: CheckCircle2, barClassName: 'bg-brand' },
  { key: 'pending', label: 'Pending', icon: Clock, barClassName: 'bg-muted-foreground' },
  { key: 'flagged', label: 'Flagged', icon: Flag, barClassName: 'bg-destructive/60' },
  { key: 'rejected', label: 'Rejected', icon: XCircle, barClassName: 'bg-destructive' },
] as const;

export function ResourceStatusBreakdown({ data }: ResourceStatusBreakdownProps) {
  const max = Math.max(1, ...STATUS_META.map((status) => data[status.key] ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources by status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {STATUS_META.map(({ key, label, icon: Icon, barClassName }) => {
          const value = data[key] ?? 0;
          const width = Math.round((value / max) * 100);
          return (
            <div key={key} className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', barClassName)}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                {value}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
