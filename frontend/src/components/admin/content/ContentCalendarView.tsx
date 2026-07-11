'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResources } from '@/lib/hooks/useResources';
import { publishArticle } from '@/lib/api/resources';
import { ROUTES } from '@/lib/constants/routes';
import type { Resource } from '@/types/resource';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function articleDate(article: Resource): Date | null {
  const raw = article.article?.scheduled_at ?? article.published_at ?? article.updated_at;
  return raw ? new Date(raw) : null;
}

function DraggableArticleCard({ article }: { article: Resource }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: article.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border border-border/60 bg-background p-1.5 text-xs ${isDragging ? 'opacity-50' : ''}`}
    >
      <Link
        href={ROUTES.adminContentArticleEdit(article.slug)}
        onClick={(event) => event.stopPropagation()}
        className="line-clamp-2 font-medium hover:underline"
      >
        {article.title}
      </Link>
      <StatusBadge status={article.status} />
    </div>
  );
}

function DayCell({ date, articles }: { date: Date; articles: Resource[] }) {
  const key = dateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: key });
  const isToday = key === dateKey(new Date());

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-28 flex-col gap-1 rounded-lg border p-1.5 ${isOver ? 'border-brand bg-brand/5' : 'border-border/60'} ${isToday ? 'ring-1 ring-brand' : ''}`}
    >
      <span className="text-xs text-muted-foreground">{date.getDate()}</span>
      {articles.map((article) => (
        <DraggableArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

// Drag-drop reuses @dnd-kit/core (already installed, used elsewhere for
// PinnedResourcesSection's sortable list) — no new dependency. Dropping an
// article card on a day cell calls the existing publishArticle({scheduled_at})
// endpoint (5A-1) to reschedule it; nothing new on the backend for this.
export function ContentCalendarView() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const queryClient = useQueryClient();
  // Slug varies per drag event, so this can't use the per-slug
  // usePublishArticle(slug) hook (bound at mount) — a plain mutation calling
  // the same underlying publishArticle() API function instead.
  const rescheduleMutation = useMutation({
    mutationFn: ({ slug, scheduledAt }: { slug: string; scheduledAt: string }) =>
      publishArticle(slug, { scheduled_at: scheduledAt }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', variables.slug] });
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const { data: scheduled } = useResources({ type: 'article', status: 'scheduled', limit: 100 });
  const { data: published } = useResources({ type: 'article', status: 'approved', sort: 'updated', limit: 100 });
  const { data: drafts } = useResources({ type: 'article', status: 'draft', sort: 'updated', limit: 50 });

  const allArticles = useMemo(
    () => [...(scheduled?.data ?? []), ...(published?.data ?? []), ...(drafts?.data ?? [])],
    [scheduled, published, drafts],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const article of allArticles) {
      const date = articleDate(article);
      if (!date) continue;
      const key = dateKey(date);
      map.set(key, [...(map.get(key) ?? []), article]);
    }
    return map;
  }, [allArticles]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const article = allArticles.find((a) => a.id === active.id);
    if (!article) return;

    const targetDate = new Date(`${over.id}T09:00:00`);
    rescheduleMutation.mutate(
      { slug: article.slug, scheduledAt: targetDate.toISOString() },
      {
        onSuccess: () => toast.success(`Rescheduled "${article.title}".`),
        onError: (error) => toast.error(errorMessage(error, 'Could not reschedule this article.')),
      },
    );
  }

  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const startWeekday = monthStart.getDay();
  const daysInMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0).getDate();
  const gridDays: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), i + 1)),
  ];

  function shiftMonth(delta: number) {
    setAnchorDate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + delta, 1));
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Content Calendar</h1>
          <p className="mt-1 text-muted-foreground">Drag an article onto a day to reschedule it.</p>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'month' ? (
        <>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="text-sm font-medium">
              {anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {gridDays.map((date, index) =>
                date ? (
                  <DayCell key={dateKey(date)} date={date} articles={byDate.get(dateKey(date)) ?? []} />
                ) : (
                  <div key={`empty-${index}`} />
                ),
              )}
            </div>
          </DndContext>
        </>
      ) : (
        <WeekOrDayList view={view} anchorDate={anchorDate} byDate={byDate} />
      )}
    </PageContainer>
  );
}

function WeekOrDayList({
  view,
  anchorDate,
  byDate,
}: {
  view: 'week' | 'day';
  anchorDate: Date;
  byDate: Map<string, Resource[]>;
}) {
  const days: Date[] =
    view === 'day'
      ? [anchorDate]
      : Array.from({ length: 7 }, (_, i) => {
          const start = new Date(anchorDate);
          start.setDate(anchorDate.getDate() - anchorDate.getDay() + i);
          return start;
        });

  return (
    <div className="mt-4 flex flex-col gap-3">
      {days.map((date) => {
        const articles = byDate.get(dateKey(date)) ?? [];
        return (
          <div key={dateKey(date)} className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">
              {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            {articles.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {articles.map((article) => (
                  <li key={article.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={ROUTES.adminContentArticleEdit(article.slug)} className="hover:underline">
                      {article.title}
                    </Link>
                    <StatusBadge status={article.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
