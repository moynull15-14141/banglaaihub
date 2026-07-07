import { Badge } from '@/components/ui/badge';
import type { ResourceStatus } from '@/types/resource';

const STATUS_CONFIG: Record<ResourceStatus, { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  flagged: { label: 'Flagged', variant: 'destructive' },
};

interface StatusBadgeProps {
  status: ResourceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
