'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { ContributorApplicationForm } from '@/components/contributor/ContributorApplicationForm';
import { ContributorApplicationStatusCard } from '@/components/contributor/ContributorApplicationStatusCard';
import { SampleUploadSection } from '@/components/contributor/SampleUploadSection';
import { ApplicationHistoryTimeline } from '@/components/admin/contributor-applications/ApplicationHistoryTimeline';
import { useMyContributorApplication } from '@/lib/hooks/useContributorApplication';

const ACTIVE_STATUSES = new Set(['pending', 'needs_revision']);
const CAN_REAPPLY_STATUSES = new Set(['rejected', 'withdrawn']);

export default function ContributorApplicationPage() {
  const { data: application, isLoading, isError, refetch } = useMyContributorApplication();
  const [reapplying, setReapplying] = useState(false);

  if (isLoading) {
    return <LoadingScreen label="Loading your application…" />;
  }

  if (isError) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState
          title="Couldn't load your contributor application"
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const isActive = application ? ACTIVE_STATUSES.has(application.status) : false;
  const canReapply = application ? CAN_REAPPLY_STATUSES.has(application.status) : false;
  const showForm = !application || application.status === 'needs_revision' || (canReapply && reapplying);

  return (
    <PageContainer className="max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        Become a Contributor
      </h1>
      <p className="mt-1 text-muted-foreground">
        Contributors can submit datasets, papers, tools, and prompts to Bangla AI Hub. Tell us
        about yourself and we&apos;ll review your application.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {application ? <ContributorApplicationStatusCard application={application} /> : null}

        {canReapply && !reapplying ? (
          <div>
            <Button type="button" onClick={() => setReapplying(true)}>
              Apply again
            </Button>
          </div>
        ) : null}

        {showForm ? (
          <ContributorApplicationForm
            mode={application?.status === 'needs_revision' ? 'edit' : 'submit'}
            initialValues={application ?? undefined}
          />
        ) : null}

        {isActive && application ? (
          <SampleUploadSection
            sampleFileUrls={application.sample_file_urls}
            supportingDocumentUrls={application.supporting_document_urls}
          />
        ) : null}

        {application ? (
          <ApplicationHistoryTimeline entries={application.previous_applications} />
        ) : null}
      </div>
    </PageContainer>
  );
}
