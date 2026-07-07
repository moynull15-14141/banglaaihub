'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/admin/moderation/ConfirmActionDialog';
import { useWithdrawContributorApplication } from '@/lib/hooks/useContributorApplication';
import { formatDate } from '@/lib/utils/format';
import type {
  ContributorApplicationStatus,
  MyContributorApplication,
} from '@/types/contributor-application';

const STATUS_CONFIG: Record<
  ContributorApplicationStatus,
  { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary'; description: string }
> = {
  pending: {
    label: 'Under review',
    variant: 'warning',
    description: 'Your application is in the review queue. We will notify you once there is a decision.',
  },
  needs_revision: {
    label: 'Needs revision',
    variant: 'warning',
    description: 'The review team asked for a few changes before a final decision.',
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    description: 'You are a contributor. You can now submit resources to Bangla AI Hub.',
  },
  rejected: {
    label: 'Not approved',
    variant: 'destructive',
    description: 'Your application was not approved this time.',
  },
  withdrawn: {
    label: 'Withdrawn',
    variant: 'secondary',
    description: 'You withdrew this application.',
  },
};

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface ContributorApplicationStatusCardProps {
  application: MyContributorApplication;
}

export function ContributorApplicationStatusCard({
  application,
}: ContributorApplicationStatusCardProps) {
  const config = STATUS_CONFIG[application.status];
  const withdrawMutation = useWithdrawContributorApplication();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleWithdraw() {
    withdrawMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Application withdrawn.');
        setConfirmOpen(false);
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not withdraw this application.')),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={config.variant}>{config.label}</Badge>
          <span className="text-xs text-muted-foreground">
            Submitted {formatDate(application.submitted_at)}
            {application.reviewed_at ? ` · Reviewed ${formatDate(application.reviewed_at)}` : ''}
          </span>
        </div>
        <CardTitle>Your contributor application</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {application.feedback_to_applicant ? (
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            <p className="mb-1 font-medium">Feedback from the review team</p>
            <p className="text-muted-foreground whitespace-pre-line">
              {application.feedback_to_applicant}
            </p>
          </div>
        ) : null}

        {application.status === 'pending' ? (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
              Withdraw application
            </Button>
          </div>
        ) : null}
      </CardContent>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Withdraw this application?"
        description="You can reapply any time, but this specific application will be marked as withdrawn and can't be resumed."
        confirmLabel="Withdraw application"
        variant="destructive"
        isPending={withdrawMutation.isPending}
        onConfirm={handleWithdraw}
      />
    </Card>
  );
}
