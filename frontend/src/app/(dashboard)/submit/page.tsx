'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { ComingSoonPage } from '@/components/common/ComingSoonPage';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import { useMyContributorApplication } from '@/lib/hooks/useContributorApplication';
import { CONTRIBUTOR_TIER_ROLES } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';

const ACTIVE_STATUSES = new Set(['pending', 'needs_revision']);

// Shown instead of the submit form for any account below the `contributor`
// tier — reflects an in-progress application if one exists rather than
// always saying "become a contributor" to someone who already applied.
function SubmitLockView() {
  const { data: application } = useMyContributorApplication();
  const hasActiveApplication = application && ACTIVE_STATUSES.has(application.status);

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          {application ? (
            <div className="mt-3">
              <ApplicationStatusBadge status={application.status} />
            </div>
          ) : null}
          <CardTitle className="mt-3">Only approved contributors can submit resources</CardTitle>
          <CardDescription>
            {hasActiveApplication
              ? "Your contributor application is still being reviewed. We'll let you know as soon as there's a decision."
              : application
                ? 'Check your application for feedback, or reapply if you’re ready to try again.'
                : 'Apply to become a contributor to submit datasets, papers, tools, and prompts. Most applications are reviewed within a few days.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href={ROUTES.contributorApplication}>
              {application ? 'View application' : 'Become a Contributor'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default function SubmitPage() {
  return (
    <RoleGuard allowedRoles={[...CONTRIBUTOR_TIER_ROLES]} fallback={<SubmitLockView />}>
      <ComingSoonPage
        title="Submit Resource"
        description="A form to submit datasets, papers, and tools is on the way."
      />
    </RoleGuard>
  );
}
