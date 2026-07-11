import { prisma } from '../config/database';

export type SeoDuplicateField = 'title' | 'seo_description' | 'canonical_url';

export interface PublishReadiness {
  passed: boolean;
  failures: string[];
}

export class SeoService {
  // Phase 5A-3 (Editorial Workflow) — the "Publish Checklist" gate. Reuses
  // the same field-presence checks as computeScore()/getDashboard() below
  // (the frontend's live scoreArticle() is the richer, instant version of
  // this same idea — see frontend/src/lib/seo/scoreArticle.ts) rather than
  // introducing new scoring logic. Only the hard-requirement subset blocks
  // publish; softer scoring nuance (readability, link counts) stays
  // editor-guidance-only, not a publish blocker.
  static checkPublishReadiness(article: {
    resource: { title: string };
    excerpt: string | null;
    body: string | null;
    featuredImageUrl: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
  }): PublishReadiness {
    const failures: string[] = [];
    const wordCount = (article.body ?? '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

    if (!article.excerpt?.trim()) failures.push('Excerpt is required before publishing.');
    if (!article.featuredImageUrl) failures.push('A featured image is required before publishing.');
    if (wordCount < 100) failures.push('Content is too short to publish (minimum ~100 words).');
    if (article.canonicalUrl) {
      try {
        new URL(article.canonicalUrl);
      } catch {
        failures.push('Canonical URL is set but is not a valid URL.');
      }
    }

    return { passed: failures.length === 0, failures };
  }

  // GET /seo/duplicate-check — powers the editor's debounced duplicate-title/
  // description/canonical warnings and the "prevent duplicate canonicals"
  // requirement. Scoped to `article`-typed, non-deleted resources only —
  // duplicate titles across unrelated resource types (e.g. a dataset and an
  // article sharing a name) aren't an SEO problem the way two articles
  // competing for the same query is.
  static async checkDuplicate(
    field: SeoDuplicateField,
    value: string,
    excludeSlug?: string,
  ): Promise<{ duplicate: boolean }> {
    const trimmed = value.trim();
    if (!trimmed) return { duplicate: false };

    if (field === 'title') {
      const match = await prisma.resource.findFirst({
        where: {
          type: 'article',
          deletedAt: null,
          slug: excludeSlug ? { not: excludeSlug } : undefined,
          title: { equals: trimmed, mode: 'insensitive' },
        },
        select: { id: true },
      });
      return { duplicate: match !== null };
    }

    const articleField = field === 'seo_description' ? 'seoDescription' : 'canonicalUrl';
    const match = await prisma.article.findFirst({
      where: {
        [articleField]: { equals: trimmed, mode: 'insensitive' },
        resource: {
          deletedAt: null,
          slug: excludeSlug ? { not: excludeSlug } : undefined,
        },
      },
      select: { id: true },
    });
    return { duplicate: match !== null };
  }

  // Backend twin of frontend/src/lib/seo/scoreArticle.ts — same weighted
  // checklist, kept in sync by hand (no shared package exists between the
  // two npm workspaces). Used only for this dashboard's aggregate average,
  // never as a per-request live endpoint (the editor scores instantly,
  // client-side, with no round trip).
  private static computeScore(article: {
    resource: { title: string; slug: string };
    excerpt: string | null;
    body: string | null;
    focusKeyword: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
    featuredImageUrl: string | null;
    featuredImageAlt: string | null;
  }): number {
    const title = article.resource.title;
    const seoTitle = article.seoTitle?.trim() || title;
    const seoDescription = article.seoDescription?.trim() || article.excerpt?.trim() || '';
    const bodyText = (article.body ?? '').replace(/<[^>]*>/g, ' ');
    const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
    const focusKeyword = article.focusKeyword?.trim() ?? '';

    let points = 0;
    const max = 100;

    points += title.length >= 30 && title.length <= 65 ? 5 : 2;
    points += seoTitle.length >= 30 && seoTitle.length <= 60 ? 5 : 2;
    points += seoDescription.length >= 120 && seoDescription.length <= 160 ? 10 : seoDescription.length > 0 ? 5 : 0;
    points += focusKeyword ? 2 : 0;
    points += focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase()) ? 5 : 0;
    points += focusKeyword && article.resource.slug.replace(/-/g, ' ').includes(focusKeyword.toLowerCase()) ? 4 : 0;
    points += focusKeyword && bodyText.slice(0, 1500).toLowerCase().includes(focusKeyword.toLowerCase()) ? 4 : 0;
    points += wordCount >= 600 ? 10 : wordCount >= 300 ? 6 : 2;
    points += article.excerpt?.trim() ? 5 : 0;
    points += wordCount > 0 ? 6 : 0; // readability floor — full Flesch calc lives client-side only
    points += 6; // heading_structure — not recomputed server-side, assumed neutral-pass for the aggregate
    points += (article.body ?? '').includes('<a ') ? 8 : 0;
    points += 4; // external_links — neutral for the aggregate (see note above)
    points += article.featuredImageUrl ? 5 : 0;
    points += article.featuredImageUrl && article.featuredImageAlt?.trim() ? 3 : 0;
    points += 2; // body_image_alt — neutral (no inline images supported yet, see 5A-1 limitation)
    points += article.resource.slug.length > 0 && article.resource.slug.length <= 75 ? 2 : 0;
    points += !article.canonicalUrl || isValidUrl(article.canonicalUrl) ? 2 : 0;
    const ogReady = Boolean(seoTitle && seoDescription && article.featuredImageUrl);
    points += ogReady ? 3 : 1;
    points += ogReady ? 2 : 0;
    points += 1; // schema_type — always generated

    return Math.round((points / max) * 100);
  }

  // Admin SEO dashboard (Phase 5A-2). Originally aggregate-only by design
  // ("no per-article analytics" meant no views/CTR, which still holds —
  // that data isn't tracked per-article at all) — but the per-article score
  // itself was already computed right here for the average and just
  // discarded, leaving editors with a single number and no way to find
  // *which* article to act on. `articles` below surfaces that same
  // already-computed score per article instead of throwing it away.
  static async getDashboard(): Promise<{
    article_count: number;
    average_score: number;
    missing_meta_description: number;
    missing_og_image: number;
    missing_canonical: number;
    missing_focus_keyword: number;
    low_word_count: number;
    duplicate_titles: { title: string; count: number }[];
    duplicate_descriptions: { description: string; count: number }[];
    articles: { slug: string; title: string; status: string; score: number }[];
  }> {
    const articles = await prisma.article.findMany({
      where: { resource: { deletedAt: null } },
      include: { resource: { select: { title: true, slug: true, status: true, deletedAt: true } } },
    });

    if (articles.length === 0) {
      return {
        article_count: 0,
        average_score: 0,
        missing_meta_description: 0,
        missing_og_image: 0,
        missing_canonical: 0,
        missing_focus_keyword: 0,
        low_word_count: 0,
        duplicate_titles: [],
        duplicate_descriptions: [],
        articles: [],
      };
    }

    let totalScore = 0;
    let missingMetaDescription = 0;
    let missingOgImage = 0;
    let missingCanonical = 0;
    let missingFocusKeyword = 0;
    let lowWordCount = 0;

    const titleCounts = new Map<string, number>();
    const descriptionCounts = new Map<string, number>();
    const perArticle: { slug: string; title: string; status: string; score: number }[] = [];

    for (const article of articles) {
      const score = this.computeScore(article);
      totalScore += score;
      perArticle.push({
        slug: article.resource.slug,
        title: article.resource.title,
        status: article.resource.status,
        score,
      });

      if (!article.seoDescription?.trim() && !article.excerpt?.trim()) missingMetaDescription += 1;
      if (!article.featuredImageUrl) missingOgImage += 1;
      if (!article.canonicalUrl) missingCanonical += 1;
      if (!article.focusKeyword?.trim()) missingFocusKeyword += 1;

      const wordCount = (article.body ?? '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 300) lowWordCount += 1;

      const titleKey = article.resource.title.trim().toLowerCase();
      if (titleKey) titleCounts.set(titleKey, (titleCounts.get(titleKey) ?? 0) + 1);

      const descriptionKey = (article.seoDescription ?? article.excerpt ?? '').trim().toLowerCase();
      if (descriptionKey) descriptionCounts.set(descriptionKey, (descriptionCounts.get(descriptionKey) ?? 0) + 1);
    }

    // Worst-first — the whole point of surfacing this list is "which article
    // needs attention," not just "here's every article."
    perArticle.sort((a, b) => a.score - b.score);

    return {
      article_count: articles.length,
      average_score: Math.round(totalScore / articles.length),
      missing_meta_description: missingMetaDescription,
      missing_og_image: missingOgImage,
      missing_canonical: missingCanonical,
      missing_focus_keyword: missingFocusKeyword,
      low_word_count: lowWordCount,
      duplicate_titles: Array.from(titleCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([title, count]) => ({ title, count })),
      duplicate_descriptions: Array.from(descriptionCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([description, count]) => ({ description, count })),
      articles: perArticle,
    };
  }
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
