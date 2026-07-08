import { EditResourceView } from '@/components/resource/EditResourceView';

interface EditResourcePageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { slug } = await params;
  return <EditResourceView slug={slug} />;
}
