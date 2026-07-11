import { Badge } from '@/components/ui/badge';
import type { ResourceStatus } from '@/types/resource';

const STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  flagged: { label: 'Flagged', variant: 'destructive' },
  // Phase 5A-1 — Content Platform article statuses.
  draft: { label: 'Draft', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  archived: { label: 'Archived', variant: 'outline' },
  // Phase 5A-3 — Editorial Workflow pre-publish states.
  idea: { label: 'Idea', variant: 'outline' },
  in_review: { label: 'In Review', variant: 'warning' },
  seo_review: { label: 'SEO Review', variant: 'warning' },
  needs_changes: { label: 'Needs Changes', variant: 'destructive' },
  ready_to_publish: { label: 'Ready to Publish', variant: 'success' },
};

interface StatusBadgeProps {
  status: ResourceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
