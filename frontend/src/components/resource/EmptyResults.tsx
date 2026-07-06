import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

interface EmptyResultsProps {
  title?: string;
  description?: string;
}

export function EmptyResults({
  title = 'No results found',
  description = 'Try adjusting your filters or search terms.',
}: EmptyResultsProps) {
  return <EmptyState icon={SearchX} title={title} description={description} />;
}
