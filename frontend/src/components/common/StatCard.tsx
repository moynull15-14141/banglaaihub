import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils/format';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      {/* Mobile: icon drops below the label/value, bottom-left, with its own
          spacing — stacking it beside the text on a narrow 3-up grid made it
          crowd the number. From sm: up there's room, so it goes back to
          sitting top-right beside the text, GitHub stat-row style. */}
      <CardContent className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:py-5">
        <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
          {/* Wraps rather than truncates — some labels (admin dashboard's
              "Pending contributor applications") are long enough that
              cutting them off would hide the actual meaning. */}
          <p className="text-xs leading-tight font-medium text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {hint ? <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{hint}</p> : null}
        </div>
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand sm:mt-0 sm:size-10">
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
