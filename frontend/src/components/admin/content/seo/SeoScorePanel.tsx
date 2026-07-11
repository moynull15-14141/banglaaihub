'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { scoreArticle, type ScoreArticleInput, type SeoCheck } from '@/lib/seo/scoreArticle';
import { useSeoDuplicateCheck } from '@/lib/hooks/useSeo';

interface SeoScorePanelProps {
  input: ScoreArticleInput;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function StatusIcon({ status }: { status: SeoCheck['status'] }) {
  if (status === 'pass') return <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  if (status === 'warn') return <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  return <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />;
}

// Every check here is computed live from the article's real fields via
// scoreArticle() (frontend/src/lib/seo/scoreArticle.ts) — recalculated on
// every render, since it's a cheap pure function with no network round trip.
// The only network-backed checks (duplicate title/description) are
// debounced separately via useSeoDuplicateCheck. Internal links, previews,
// and the advanced fields live in the sibling SeoDetailsPanel instead — this
// card stays just the live score + checklist so the sticky sidebar it sits
// in doesn't grow into a long scroll of its own.
export function SeoScorePanel({ input }: SeoScorePanelProps) {
  const { score, checks } = useMemo(() => scoreArticle(input), [input]);

  const titleDuplicate = useSeoDuplicateCheck('title', input.title, input.slug);
  const descriptionDuplicate = useSeoDuplicateCheck(
    'seo_description',
    input.seoDescription || input.excerpt || '',
    input.slug,
  );
  const canonicalDuplicate = useSeoDuplicateCheck('canonical_url', input.canonicalUrl ?? '', input.slug);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SEO score</CardTitle>
            <CardDescription>Recalculates live as you write.</CardDescription>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${scoreColor(score)}`} aria-live="polite">
            {score}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </div>
        </div>
        <Progress value={score} className="mt-2" aria-label={`SEO score: ${score} out of 100`} />
      </CardHeader>
      <CardContent>
        <h3 className="mb-2 text-sm font-medium">Checklist</h3>
        <ul className="flex flex-col gap-1.5">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2 text-sm">
              <StatusIcon status={check.status} />
              <div className="min-w-0">
                <span className="font-medium">{check.label}</span>
                <span className="text-muted-foreground"> — {check.message}</span>
              </div>
            </li>
          ))}
          {titleDuplicate.data?.duplicate ? (
            <li className="flex items-start gap-2 text-sm">
              <StatusIcon status="fail" />
              <span>Another article already uses this exact title.</span>
            </li>
          ) : null}
          {descriptionDuplicate.data?.duplicate ? (
            <li className="flex items-start gap-2 text-sm">
              <StatusIcon status="fail" />
              <span>Another article already uses this exact meta description.</span>
            </li>
          ) : null}
          {canonicalDuplicate.data?.duplicate ? (
            <li className="flex items-start gap-2 text-sm">
              <StatusIcon status="fail" />
              <span>Another article already uses this canonical URL.</span>
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
