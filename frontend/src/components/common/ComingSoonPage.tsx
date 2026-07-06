import { Construction } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

// Shared shell for pages whose functionality hasn't shipped yet — gives them
// the same premium look as the rest of the app instead of a bare heading.
export function ComingSoonPage({
  title,
  description = "This part of Bangla AI Hub is still being built. Check back soon.",
}: ComingSoonPageProps) {
  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <div className="mt-6">
        <EmptyState icon={Construction} title="Coming soon" description={description} />
      </div>
    </PageContainer>
  );
}
