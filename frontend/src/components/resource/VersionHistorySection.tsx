'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resourceHref } from '@/lib/constants/routes';
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from '@/lib/constants/resourceTypes';
import { useResourceVersions } from '@/lib/hooks/useResources';
import { formatDate } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';

interface VersionHistorySectionProps {
  resource: Resource;
}

// Phase 3A.1, Parts 2/3. One fetch (useResourceVersions, only enabled for
// model/prompt) feeds both the Prev/Next nav bar and the History card below
// it — no separate API calls. Renders nothing if there's no chain (0 or 1
// entries) — no placeholder UI for resources with no version history.
// Browsing only: "Open" is a plain link to that version's own detail page,
// reusing ResourceDetailView entirely — no edit/merge/compare affordance.
export function VersionHistorySection({ resource }: VersionHistorySectionProps) {
  const isVersioned = resource.type === 'model' || resource.type === 'prompt';
  const { data: chain } = useResourceVersions(resource.slug, isVersioned);

  if (!isVersioned || !chain || chain.length <= 1) return null;

  const currentIndex = chain.findIndex((entry) => entry.is_current);
  const previous = currentIndex > 0 ? chain[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < chain.length - 1 ? chain[currentIndex + 1] : null;

  return (
    <div className="space-y-3">
      {previous || next ? (
        <div className="flex items-center justify-between gap-3">
          {previous ? (
            <Button asChild variant="outline" size="sm">
              <Link href={resourceHref(previous.type, previous.slug)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous Version
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button asChild variant="outline" size="sm">
              <Link href={resourceHref(next.type, next.slug)}>
                Next Version
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card className="px-4" data-testid="version-history-card">
        <CardHeader className="px-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" aria-hidden="true" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-0">
          {chain.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{entry.version ?? 'v1.0'}</span>
                  {entry.is_current ? <Badge variant="brand">Current</Badge> : null}
                  <Badge variant={STATUS_BADGE_VARIANT[entry.status] ?? 'secondary'}>
                    {STATUS_LABEL[entry.status] ?? entry.status}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.author?.display_name ?? entry.author?.username ?? 'Unknown author'}
                  {entry.published_at ? ` · ${formatDate(entry.published_at)}` : ''}
                </p>
              </div>
              {!entry.is_current ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={resourceHref(entry.type, entry.slug)}>Open</Link>
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
