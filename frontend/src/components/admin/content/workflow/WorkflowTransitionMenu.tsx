'use client';

import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/admin/moderation/StatusBadge';
import { useAvailableTransitions, useTransitionArticle } from '@/lib/hooks/useArticleWorkflow';
import type { ResourceStatus } from '@/types/resource';

const STATUS_LABELS: Record<ResourceStatus, string> = {
  pending: 'Pending',
  approved: 'Published',
  rejected: 'Rejected',
  flagged: 'Flagged',
  draft: 'Draft',
  scheduled: 'Scheduled',
  archived: 'Archived',
  idea: 'Idea',
  in_review: 'In Review',
  seo_review: 'SEO Review',
  needs_changes: 'Needs Changes',
  ready_to_publish: 'Ready to Publish',
};

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface WorkflowTransitionMenuProps {
  slug: string;
  status: ResourceStatus;
}

// Only valid transitions are ever offered — the menu's contents come
// straight from ArticleWorkflowService.availableTransitions(), so a Writer
// without content:review never even sees "Move to SEO Review" as an option,
// rather than seeing it and getting a 403.
export function WorkflowTransitionMenu({ slug, status }: WorkflowTransitionMenuProps) {
  const { data: transitions, isLoading } = useAvailableTransitions(slug);
  const transitionMutation = useTransitionArticle(slug);

  if (isLoading || !transitions || transitions.length === 0) {
    return <StatusBadge status={status} />;
  }

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" loading={transitionMutation.isPending}>
            <ArrowRight className="size-4" aria-hidden="true" />
            Move to…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transitions.map((transition) => (
            <DropdownMenuItem
              key={transition.to}
              onClick={() =>
                transitionMutation.mutate(transition.to, {
                  onSuccess: () => toast.success(`Moved to ${STATUS_LABELS[transition.to]}.`),
                  onError: (error) => toast.error(errorMessage(error, 'Could not update the workflow status.')),
                })
              }
            >
              {STATUS_LABELS[transition.to]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
