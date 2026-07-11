import type { Metadata } from 'next';
import { getResourceBySlug } from '@/lib/api/resources';
import { ArticleDetailView } from '@/components/resource/ArticleDetailView';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const resource = await getResourceBySlug(slug);
    const article = resource.article;
    const title = article?.seo_title || resource.title;
    const description = article?.seo_description || article?.excerpt || resource.description?.slice(0, 160);
    const image = article?.social_image_url ?? article?.featured_image_url ?? resource.thumbnail_url ?? undefined;

    return {
      title,
      description,
      alternates: article?.canonical_url ? { canonical: article.canonical_url } : undefined,
      openGraph: {
        title,
        description,
        images: image ? [{ url: image }] : undefined,
        type: 'article',
        publishedTime: resource.published_at ?? undefined,
        modifiedTime: resource.updated_at,
        authors: resource.author?.display_name ? [resource.author.display_name] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: 'Article' };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticleDetailView slug={slug} />;
}
