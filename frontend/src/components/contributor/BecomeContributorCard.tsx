'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyContributorApplication } from '@/lib/hooks/useContributorApplication';
import { ROUTES } from '@/lib/constants/routes';
import { hasContributorAccess } from '@/lib/constants/roles';

const ACTIVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Application under review',
  needs_revision: 'Application needs revision',
};

// Hidden entirely once the user is already a contributor (or higher) — this
// CTA is only for plain `user`-role accounts deciding whether to apply.
export function BecomeContributorCard() {
  const { user } = useAuth();
  const { data: application } = useMyContributorApplication();

  if (!user || hasContributorAccess(user.roles)) {
    return null;
  }

  const statusLabel = application ? ACTIVE_STATUS_LABELS[application.status] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" aria-hidden="true" />
          Become a Contributor
        </CardTitle>
        <CardDescription>
          {statusLabel ??
            'Apply to unlock submitting datasets, papers, tools, and prompts to Bangla AI Hub.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href={ROUTES.contributorApplication}>
            {application ? 'View application' : 'Apply now'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
