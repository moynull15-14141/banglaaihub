import { analyzeReadability } from './readability';

export type SeoCheckStatus = 'pass' | 'warn' | 'fail';

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoCheckStatus;
  points: number;
  maxPoints: number;
  message: string;
}

export interface SeoScoreResult {
  score: number;
  checks: SeoCheck[];
}

export interface ScoreArticleInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  bodyHtml?: string | null;
  focusKeyword?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  categoryId?: number | null;
  tags?: string[];
  siteOrigin?: string;
}

function contains(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle.trim()) return false;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// The real, weighted 0-100 scorer that both the live article editor and the
// backend's admin-dashboard average (see backend/src/services/seo.service.ts's
// computeArticleSeoScore, kept in sync with this file by hand since no
// shared package exists between the two npm workspaces) are built from.
// Every check here is a real computation over the article's actual fields —
// nothing here is ever a placeholder/fake value.
export function scoreArticle(input: ScoreArticleInput): SeoScoreResult {
  const body = input.bodyHtml ?? '';
  const stats = analyzeReadability(body, input.siteOrigin ?? '');
  const focusKeyword = input.focusKeyword?.trim() ?? '';
  const seoTitle = input.seoTitle?.trim() || input.title;
  const seoDescription = input.seoDescription?.trim() || input.excerpt?.trim() || '';

  const checks: SeoCheck[] = [];

  // --- Title & Meta (20) -----------------------------------------------
  checks.push(
    input.title.length >= 30 && input.title.length <= 65
      ? { id: 'title_length', label: 'Title length', status: 'pass', points: 5, maxPoints: 5, message: 'Title is a good length for search results.' }
      : { id: 'title_length', label: 'Title length', status: 'warn', points: 2, maxPoints: 5, message: `Title is ${input.title.length} characters — aim for 30-65.` },
  );

  checks.push(
    seoTitle.length >= 30 && seoTitle.length <= 60
      ? { id: 'seo_title', label: 'SEO title length', status: 'pass', points: 5, maxPoints: 5, message: 'SEO title fits within Google’s typical display width.' }
      : { id: 'seo_title', label: 'SEO title length', status: 'warn', points: 2, maxPoints: 5, message: `SEO title is ${seoTitle.length} characters — aim for 30-60.` },
  );

  checks.push(
    seoDescription.length >= 120 && seoDescription.length <= 160
      ? { id: 'meta_description', label: 'Meta description length', status: 'pass', points: 10, maxPoints: 10, message: 'Meta description is a good length.' }
      : seoDescription.length > 0
        ? { id: 'meta_description', label: 'Meta description length', status: 'warn', points: 5, maxPoints: 10, message: `Meta description is ${seoDescription.length} characters — aim for 120-160.` }
        : { id: 'meta_description', label: 'Meta description length', status: 'fail', points: 0, maxPoints: 10, message: 'No meta description or excerpt set.' },
  );

  // --- Keyword usage (15) ------------------------------------------------
  checks.push(
    focusKeyword
      ? { id: 'focus_keyword_set', label: 'Focus keyword set', status: 'pass', points: 2, maxPoints: 2, message: `Focus keyword: "${focusKeyword}".` }
      : { id: 'focus_keyword_set', label: 'Focus keyword set', status: 'warn', points: 0, maxPoints: 2, message: 'Set a focus keyword to unlock keyword-placement checks.' },
  );

  checks.push(
    !focusKeyword
      ? { id: 'keyword_in_title', label: 'Keyword in title', status: 'warn', points: 0, maxPoints: 5, message: 'Set a focus keyword first.' }
      : contains(input.title, focusKeyword)
        ? { id: 'keyword_in_title', label: 'Keyword in title', status: 'pass', points: 5, maxPoints: 5, message: 'Focus keyword appears in the title.' }
        : { id: 'keyword_in_title', label: 'Keyword in title', status: 'fail', points: 0, maxPoints: 5, message: 'Focus keyword is missing from the title.' },
  );

  checks.push(
    !focusKeyword
      ? { id: 'keyword_in_slug', label: 'Keyword in URL', status: 'warn', points: 0, maxPoints: 4, message: 'Set a focus keyword first.' }
      : contains(input.slug.replace(/-/g, ' '), focusKeyword)
        ? { id: 'keyword_in_slug', label: 'Keyword in URL', status: 'pass', points: 4, maxPoints: 4, message: 'Focus keyword appears in the URL.' }
        : { id: 'keyword_in_slug', label: 'Keyword in URL', status: 'warn', points: 1, maxPoints: 4, message: 'Focus keyword is missing from the URL slug.' },
  );

  checks.push(
    !focusKeyword
      ? { id: 'keyword_in_body', label: 'Keyword in content', status: 'warn', points: 0, maxPoints: 4, message: 'Set a focus keyword first.' }
      : contains(body.slice(0, 1500), focusKeyword)
        ? { id: 'keyword_in_body', label: 'Keyword in content', status: 'pass', points: 4, maxPoints: 4, message: 'Focus keyword appears early in the content.' }
        : { id: 'keyword_in_body', label: 'Keyword in content', status: 'warn', points: 1, maxPoints: 4, message: 'Focus keyword doesn’t appear near the start of the content.' },
  );

  // --- Content quality (25) -----------------------------------------------
  checks.push(
    stats.wordCount >= 600
      ? { id: 'content_length', label: 'Content length', status: 'pass', points: 10, maxPoints: 10, message: `${stats.wordCount} words — solid depth.` }
      : stats.wordCount >= 300
        ? { id: 'content_length', label: 'Content length', status: 'warn', points: 6, maxPoints: 10, message: `${stats.wordCount} words — consider expanding past 600.` }
        : { id: 'content_length', label: 'Content length', status: 'fail', points: 2, maxPoints: 10, message: `${stats.wordCount} words — too thin for most search intent.` },
  );

  checks.push(
    (input.excerpt?.trim().length ?? 0) > 0
      ? { id: 'excerpt_present', label: 'Excerpt', status: 'pass', points: 5, maxPoints: 5, message: 'Excerpt is set.' }
      : { id: 'excerpt_present', label: 'Excerpt', status: 'fail', points: 0, maxPoints: 5, message: 'No excerpt set — also used as the fallback meta description.' },
  );

  checks.push(
    stats.wordCount === 0
      ? { id: 'readability', label: 'Readability', status: 'warn', points: 0, maxPoints: 10, message: 'Add content to analyze readability.' }
      : stats.fleschScore >= 60
        ? { id: 'readability', label: 'Readability', status: 'pass', points: 10, maxPoints: 10, message: `${stats.readingDifficulty} to read (Flesch ${stats.fleschScore}).` }
        : stats.fleschScore >= 40
          ? { id: 'readability', label: 'Readability', status: 'warn', points: 5, maxPoints: 10, message: `${stats.readingDifficulty} to read — shorter sentences would help.` }
          : { id: 'readability', label: 'Readability', status: 'fail', points: 2, maxPoints: 10, message: `${stats.readingDifficulty} to read (Flesch ${stats.fleschScore}) — simplify sentences and words.` },
  );

  // --- Structure & links (20) ----------------------------------------------
  checks.push(
    stats.wordCount < 300 || stats.headingCount > 0
      ? { id: 'heading_structure', label: 'Heading structure', status: 'pass', points: 6, maxPoints: 6, message: stats.headingCount > 0 ? `${stats.headingCount} subheading(s) used.` : 'Short content — subheadings optional.' }
      : { id: 'heading_structure', label: 'Heading structure', status: 'warn', points: 2, maxPoints: 6, message: 'Add H2/H3 subheadings to break up longer content.' },
  );

  checks.push(
    stats.internalLinkCount > 0
      ? { id: 'internal_links', label: 'Internal links', status: 'pass', points: 8, maxPoints: 8, message: `${stats.internalLinkCount} internal link(s).` }
      : { id: 'internal_links', label: 'Internal links', status: 'warn', points: 0, maxPoints: 8, message: 'No internal links — use the internal link picker to add some.' },
  );

  checks.push(
    stats.externalLinkCount > 0
      ? { id: 'external_links', label: 'External links', status: 'pass', points: 6, maxPoints: 6, message: `${stats.externalLinkCount} external link(s).` }
      : { id: 'external_links', label: 'External links', status: 'warn', points: 2, maxPoints: 6, message: 'No external links — citing sources can help credibility.' },
  );

  // --- Media (10) ------------------------------------------------------
  checks.push(
    input.featuredImageUrl
      ? { id: 'featured_image', label: 'Featured image', status: 'pass', points: 5, maxPoints: 5, message: 'Featured image is set.' }
      : { id: 'featured_image', label: 'Featured image', status: 'fail', points: 0, maxPoints: 5, message: 'No featured image — needed for social/OG previews.' },
  );

  checks.push(
    !input.featuredImageUrl
      ? { id: 'featured_image_alt', label: 'Featured image alt text', status: 'warn', points: 0, maxPoints: 3, message: 'Set a featured image first.' }
      : input.featuredImageAlt?.trim()
        ? { id: 'featured_image_alt', label: 'Featured image alt text', status: 'pass', points: 3, maxPoints: 3, message: 'Alt text is set.' }
        : { id: 'featured_image_alt', label: 'Featured image alt text', status: 'fail', points: 0, maxPoints: 3, message: 'Featured image has no alt text.' },
  );

  checks.push(
    stats.imageCount === 0
      ? { id: 'body_image_alt', label: 'Content image alt text', status: 'pass', points: 2, maxPoints: 2, message: 'No inline images.' }
      : stats.imagesMissingAlt === 0
        ? { id: 'body_image_alt', label: 'Content image alt text', status: 'pass', points: 2, maxPoints: 2, message: 'All inline images have alt text.' }
        : { id: 'body_image_alt', label: 'Content image alt text', status: 'fail', points: 0, maxPoints: 2, message: `${stats.imagesMissingAlt} image(s) missing alt text.` },
  );

  // --- Technical / Schema (10) --------------------------------------------
  checks.push(
    input.slug.length > 0 && input.slug.length <= 75
      ? { id: 'slug_quality', label: 'URL quality', status: 'pass', points: 2, maxPoints: 2, message: 'URL is a reasonable length.' }
      : { id: 'slug_quality', label: 'URL quality', status: 'warn', points: 0, maxPoints: 2, message: 'URL is too long — keep it under 75 characters.' },
  );

  checks.push(
    !input.canonicalUrl || isValidUrl(input.canonicalUrl)
      ? { id: 'canonical_valid', label: 'Canonical URL', status: 'pass', points: 2, maxPoints: 2, message: input.canonicalUrl ? 'Canonical URL is valid.' : 'No override set — this page is its own canonical.' }
      : { id: 'canonical_valid', label: 'Canonical URL', status: 'fail', points: 0, maxPoints: 2, message: 'Canonical URL is not a valid URL.' },
  );

  const ogReady = Boolean(seoTitle && seoDescription && input.featuredImageUrl);
  checks.push(
    ogReady
      ? { id: 'opengraph_complete', label: 'OpenGraph', status: 'pass', points: 3, maxPoints: 3, message: 'Title, description, and image are all set for social sharing.' }
      : { id: 'opengraph_complete', label: 'OpenGraph', status: 'warn', points: 1, maxPoints: 3, message: 'Missing title, description, or image for OpenGraph.' },
  );

  checks.push(
    ogReady
      ? { id: 'twitter_complete', label: 'Twitter Card', status: 'pass', points: 2, maxPoints: 2, message: 'Twitter summary card is ready.' }
      : { id: 'twitter_complete', label: 'Twitter Card', status: 'warn', points: 0, maxPoints: 2, message: 'Missing title, description, or image for Twitter Card.' },
  );

  checks.push({
    id: 'schema_type',
    label: 'Structured data',
    status: 'pass',
    points: 1,
    maxPoints: 1,
    message: 'Article schema.org JSON-LD is generated automatically.',
  });

  const totalPoints = checks.reduce((sum, check) => sum + check.points, 0);
  const maxPoints = checks.reduce((sum, check) => sum + check.maxPoints, 0);
  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return { score, checks };
}
