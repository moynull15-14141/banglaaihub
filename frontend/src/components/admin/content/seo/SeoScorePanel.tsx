'use client';

import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GoogleSearchPreview } from '@/components/admin/content/seo/GoogleSearchPreview';
import { SocialPreviewTabs } from '@/components/admin/content/seo/SocialPreviewTabs';
import { InternalLinkPicker } from '@/components/admin/content/seo/InternalLinkPicker';
import { scoreArticle, type ScoreArticleInput, type SeoCheck } from '@/lib/seo/scoreArticle';
import { useSeoDuplicateCheck } from '@/lib/hooks/useSeo';

interface SeoScorePanelProps {
  input: ScoreArticleInput;
  editor: Editor | null;
  focusKeyword: string;
  onFocusKeywordChange: (value: string) => void;
  metaKeywords: string;
  onMetaKeywordsChange: (value: string) => void;
  featuredImageAlt: string;
  onFeaturedImageAltChange: (value: string) => void;
  slugValue: string;
  onSlugChange: (value: string) => void;
  slugEditable: boolean;
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
// debounced separately via useSeoDuplicateCheck.
export function SeoScorePanel({
  input,
  editor,
  focusKeyword,
  onFocusKeywordChange,
  metaKeywords,
  onMetaKeywordsChange,
  featuredImageAlt,
  onFeaturedImageAltChange,
  slugValue,
  onSlugChange,
  slugEditable,
}: SeoScorePanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
            <CardTitle>SEO</CardTitle>
            <CardDescription>Live score, previews, and structured-data checks.</CardDescription>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${scoreColor(score)}`} aria-live="polite">
            {score}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </div>
        </div>
        <Progress value={score} className="mt-2" aria-label={`SEO score: ${score} out of 100`} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Internal links</h3>
          <InternalLinkPicker editor={editor} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Google preview</h3>
          <GoogleSearchPreview
            title={input.seoTitle || input.title}
            description={input.seoDescription || input.excerpt || ''}
            slug={input.slug}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Social preview</h3>
          <SocialPreviewTabs
            title={input.seoTitle || input.title}
            description={input.seoDescription || input.excerpt || ''}
            imageUrl={input.featuredImageUrl ?? null}
            slug={input.slug}
          />
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
          >
            {advancedOpen ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
            Advanced SEO
          </Button>
          {advancedOpen ? (
            <div className="mt-3 flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="permalink">Permalink</Label>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="shrink-0">{(process.env.NEXT_PUBLIC_APP_URL ?? '') + '/articles/'}</span>
                  <Input
                    id="permalink"
                    value={slugValue}
                    onChange={(event) => onSlugChange(event.target.value)}
                    disabled={!slugEditable}
                    className="min-w-0"
                  />
                </div>
                {!slugEditable ? (
                  <p className="text-xs text-muted-foreground">Save a draft first to set a custom permalink.</p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Changing the permalink of a published article breaks existing links to it.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="focus-keyword">Focus keyword</Label>
                <Input
                  id="focus-keyword"
                  value={focusKeyword}
                  onChange={(event) => onFocusKeywordChange(event.target.value)}
                  placeholder="e.g. bangla nlp"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meta-keywords">Meta keywords</Label>
                <Input
                  id="meta-keywords"
                  value={metaKeywords}
                  onChange={(event) => onMetaKeywordsChange(event.target.value)}
                  placeholder="comma, separated, keywords"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="featured-image-alt">Featured image alt text</Label>
                <Input
                  id="featured-image-alt"
                  value={featuredImageAlt}
                  onChange={(event) => onFeaturedImageAltChange(event.target.value)}
                  placeholder="Describe the featured image for accessibility and SEO"
                />
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
