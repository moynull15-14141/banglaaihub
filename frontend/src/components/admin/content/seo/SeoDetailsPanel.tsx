'use client';

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GoogleSearchPreview } from '@/components/admin/content/seo/GoogleSearchPreview';
import { SocialPreviewTabs } from '@/components/admin/content/seo/SocialPreviewTabs';
import { InternalLinkPicker } from '@/components/admin/content/seo/InternalLinkPicker';
import type { ScoreArticleInput } from '@/lib/seo/scoreArticle';

interface SeoDetailsPanelProps {
  input: Pick<ScoreArticleInput, 'title' | 'slug' | 'excerpt' | 'seoTitle' | 'seoDescription' | 'featuredImageUrl'>;
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

// Split out of SeoScorePanel (see that file's comment) — internal links,
// search/social previews, and the advanced fields aren't needed at a glance
// the way the live score is, so this lives in the main content column
// instead of stretching the sticky SEO sidebar into a long scroll.
export function SeoDetailsPanel({
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
}: SeoDetailsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO details</CardTitle>
        <CardDescription>Internal links, search/social previews, and advanced fields.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
