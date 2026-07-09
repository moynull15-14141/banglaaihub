import type { Metadata } from 'next';
import { getResourceBySlug } from '@/lib/api/resources';
import { ResourceDetailView } from '@/components/resource/ResourceDetailView';

interface ModelPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const resource = await getResourceBySlug(slug);
    return {
      title: resource.title,
      description: resource.description?.slice(0, 160),
      openGraph: {
        title: resource.title,
        description: resource.description ?? undefined,
        images: resource.thumbnail_url ? [{ url: resource.thumbnail_url }] : undefined,
        type: 'article',
      },
    };
  } catch {
    return { title: 'Model' };
  }
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { slug } = await params;
  return <ResourceDetailView slug={slug} />;
}
