'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import { SubmitResourceView } from '@/components/resource/SubmitResourceView';
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
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-4xl">
        <CardContent className="flex flex-col items-center gap-6 px-10 py-10 text-center sm:flex-row sm:text-left">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Sparkles className="size-8" aria-hidden="true" />
          </span>
          <div className="flex-1">
            {application ? (
              <div className="mb-2 flex justify-center sm:justify-start">
                <ApplicationStatusBadge status={application.status} />
              </div>
            ) : null}
            <CardTitle className="text-xl">Only approved contributors can submit resources</CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              {hasActiveApplication
                ? "Your contributor application is still being reviewed. We'll let you know as soon as there's a decision."
                : application
                  ? 'Check your application for feedback, or reapply if you’re ready to try again.'
                  : 'Apply to become a contributor to submit datasets, papers, tools, and prompts. Most applications are reviewed within a few days.'}
            </CardDescription>
          </div>
          <Button asChild size="lg" className="shrink-0">
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
      <SubmitResourceView />
    </RoleGuard>
  );
}
