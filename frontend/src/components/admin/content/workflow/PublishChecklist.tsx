'use client';

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { scoreArticle, type ScoreArticleInput } from '@/lib/seo/scoreArticle';

// The "Publish Checklist" the brief asks for — deliberately NOT new scoring
// logic. It reuses 5A-2's scoreArticle() (the same function driving the
// live SEO score panel) and just re-labels its checks as pass/fail publish
// requirements, so the two surfaces can never silently disagree with each
// other. Hard requirements (excerpt/featured image/content length/canonical
// validity) are enforced server-side too (SeoService.checkPublishReadiness)
// — this view is guidance plus the admin-override toggle, not the only gate.
const HARD_REQUIREMENT_IDS = new Set(['excerpt_present', 'featured_image', 'content_length', 'canonical_valid']);

interface PublishChecklistProps {
  input: ScoreArticleInput;
  isAdmin: boolean;
  override: boolean;
  onOverrideChange: (value: boolean) => void;
}

export function PublishChecklist({ input, isAdmin, override, onOverrideChange }: PublishChecklistProps) {
  const { checks } = scoreArticle(input);
  const hardFailures = checks.filter((c) => HARD_REQUIREMENT_IDS.has(c.id) && c.status === 'fail');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish Checklist</CardTitle>
        <CardDescription>Requirements verified before this article can go live.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1.5">
          {checks
            .filter((check) => HARD_REQUIREMENT_IDS.has(check.id))
            .map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-sm">
                {check.status === 'pass' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span>
                  <span className="font-medium">{check.label}</span> — {check.message}
                </span>
              </li>
            ))}
        </ul>

        {hardFailures.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {hardFailures.length} requirement(s) not met — publishing is blocked until fixed.
            </div>
            {isAdmin ? (
              <div className="mt-2 flex items-center justify-between">
                <Label htmlFor="checklist-override" className="text-sm font-normal">
                  Override and publish anyway (admin only)
                </Label>
                <Switch id="checklist-override" checked={override} onCheckedChange={onOverrideChange} />
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
