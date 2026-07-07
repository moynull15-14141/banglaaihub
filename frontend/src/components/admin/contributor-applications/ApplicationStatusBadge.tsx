import { Badge } from '@/components/ui/badge';
import type { ContributorApplicationStatus } from '@/types/contributor-application';

const STATUS_CONFIG: Record<
  ContributorApplicationStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  needs_revision: { label: 'Needs revision', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' },
};

interface ApplicationStatusBadgeProps {
  status: ContributorApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
