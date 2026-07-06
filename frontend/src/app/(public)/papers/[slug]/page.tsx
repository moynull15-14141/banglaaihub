import type { Metadata } from 'next';
import { getResourceBySlug } from '@/lib/api/resources';
import { ResourceDetailView } from '@/components/resource/ResourceDetailView';

interface PaperPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PaperPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const resource = await getResourceBySlug(slug);
    return {
      title: resource.title,
      description: (resource.paper?.abstract ?? resource.description)?.slice(0, 160),
      openGraph: {
        title: resource.title,
        description: resource.paper?.abstract ?? resource.description ?? undefined,
        type: 'article',
      },
    };
  } catch {
    return { title: 'Paper' };
  }
}

export default async function PaperPage({ params }: PaperPageProps) {
  const { slug } = await params;
  return <ResourceDetailView slug={slug} />;
}
