'use client';

import { useMemo, useState } from 'react';
import { useHeatmap } from '@/lib/hooks/useActivity';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ContributionHeatmapProps {
  username: string;
  // Account creation year — the year picker never offers a year before this
  // (matches GitHub: no "2022" tab for someone who joined in 2026, since
  // there's no possible activity to show there).
  joinYear: number;
}

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL_SIZE = 11;
const CELL_GAP = 3;

// Sequential, single-hue, light→dark (dataviz skill's color formula for
// magnitude data) — level 0 is the "no contribution" floor, distinguished
// from level 1 with a visible jump (not just a shade), and level 4 is the
// brightest step so the busiest days are unmistakable at a glance.
const LEVEL_CLASSES = [
  'bg-muted/50 ring-1 ring-inset ring-border/60',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-400',
];

function levelFor(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export function ContributionHeatmap({ username, joinYear }: ContributionHeatmapProps) {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const { data, isLoading } = useHeatmap(username, year);
  // Never earlier than joinYear — clamped in case of clock skew putting
  // joinYear in the future relative to currentYear.
  const earliestYear = Math.min(joinYear, currentYear);
  const years = useMemo(
    () => Array.from({ length: currentYear - earliestYear + 1 }, (_, i) => currentYear - i),
    [currentYear, earliestYear],
  );

  const weeks = useMemo(() => {
    if (!data) return [];
    const countByDate = new Map(data.days.map((day) => [day.date, day.count]));
    const start = new Date(Date.UTC(year, 0, 1));
    // Align to the preceding Sunday so columns are full weeks.
    const startDay = start.getUTCDay();
    const gridStart = new Date(start.getTime() - startDay * 86_400_000);
    const end = new Date(Date.UTC(year, 11, 31));

    const cols: { date: string; count: number }[][] = [];
    let cursor = gridStart;
    let col: { date: string; count: number }[] = [];
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10);
      col.push({ date: dateStr, count: countByDate.get(dateStr) ?? 0 });
      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    if (col.length > 0) cols.push(col);
    return cols;
  }, [data, year]);

  // The label for a column is the month that column's 1st-of-month day
  // falls in, if any — the same placement rule GitHub's own heatmap uses,
  // so a month name appears exactly once, above the week it starts in.
  const monthLabels = useMemo(() => {
    return weeks.map((week) => {
      const firstOfMonthDay = week.find((day) => Number(day.date.slice(8, 10)) === 1);
      if (!firstOfMonthDay) return null;
      return monthFormatter.format(new Date(`${firstOfMonthDay.date}T00:00:00Z`));
    });
  }, [weeks]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{data.total_contributions}</strong> contributions in {year}
          </span>
          <span>
            Current streak: <strong className="text-foreground">{data.current_streak}</strong>
          </span>
          <span>
            Longest streak: <strong className="text-foreground">{data.longest_streak}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                y === year
                  ? 'bg-brand text-brand-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card p-4">
        <div className="inline-flex min-w-full flex-col gap-2">
          <div
            className="grid gap-x-0 text-xs text-muted-foreground"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, ${CELL_SIZE}px)`,
              columnGap: CELL_GAP,
            }}
          >
            <span />
            {monthLabels.map((label, index) => (
              <span key={index} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, ${CELL_SIZE}px)`,
              columnGap: CELL_GAP,
              rowGap: CELL_GAP,
            }}
          >
            {WEEKDAY_LABELS.map((label, rowIndex) => (
              <span
                key={rowIndex}
                className="text-xs text-muted-foreground"
                style={{ gridRow: rowIndex + 1, gridColumn: 1, height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
              >
                {label}
              </span>
            ))}
            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                const label =
                  day.count > 0
                    ? `${day.count} contribution${day.count === 1 ? '' : 's'} on ${dateFormatter.format(new Date(`${day.date}T00:00:00Z`))}`
                    : `No contributions on ${dateFormatter.format(new Date(`${day.date}T00:00:00Z`))}`;
                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger asChild>
                      <div
                        role="img"
                        aria-label={label}
                        tabIndex={0}
                        style={{ gridRow: dayIndex + 1, gridColumn: weekIndex + 2, width: CELL_SIZE, height: CELL_SIZE }}
                        className={cn(
                          'rounded-[3px] outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-brand hover:scale-110',
                          LEVEL_CLASSES[levelFor(day.count)],
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                );
              }),
            )}
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1 text-xs text-muted-foreground">
            Less
            {LEVEL_CLASSES.map((cls, index) => (
              <div key={index} className={cn('size-2.5 rounded-[3px]', cls)} />
            ))}
            More
          </div>
        </div>
      </div>
    </div>
  );
}
