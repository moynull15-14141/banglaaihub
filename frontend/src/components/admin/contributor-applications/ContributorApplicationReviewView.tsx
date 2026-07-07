'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { CheckCircle2, ExternalLink, FileText, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ApplicationStatusBadge } from '@/components/admin/contributor-applications/ApplicationStatusBadge';
import { ApplicationHistoryTimeline } from '@/components/admin/contributor-applications/ApplicationHistoryTimeline';
import {
  ApplicationDecisionDialog,
  type DecisionKind,
} from '@/components/admin/contributor-applications/ApplicationDecisionDialog';
import {
  useAdminContributorApplication,
  useApproveContributorApplication,
  useRejectContributorApplication,
  useRequestContributorApplicationRevision,
} from '@/lib/hooks/useAdmin';
import { formatDate } from '@/lib/utils/format';
import type {
  ContributorApplicationDecisionInput,
  ProfileLinkBadges,
} from '@/types/contributor-application';

const PROFILE_LINK_LABELS: Record<keyof ProfileLinkBadges, string> = {
  github_url: 'GitHub',
  kaggle_url: 'Kaggle',
  huggingface_url: 'Hugging Face',
  scholar_url: 'Google Scholar',
  linkedin_url: 'LinkedIn',
  website_url: 'Personal website / portfolio',
  orcid_id: 'ORCID',
  x_url: 'X (Twitter)',
};

const QUALITY_INDICATOR_LABELS = {
  approval_rate: 'Approval rate',
  profile_completeness: 'Profile completeness',
  resource_diversity: 'Resource diversity',
  contribution_quality_score: 'Contribution quality score',
  documentation_quality: 'Documentation quality',
  metadata_quality: 'Metadata quality',
  license_compliance: 'License compliance',
} as const;

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function ProfileLinkRow({ label, badge }: { label: string; badge: { url: string | null; connected: boolean } }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      {badge.connected && badge.url ? (
        <a
          href={badge.url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 text-brand hover:underline"
        >
          Connected
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : (
        <span className="text-muted-foreground">Not provided</span>
      )}
    </div>
  );
}

interface ContributorApplicationReviewViewProps {
  id: string;
}

export function ContributorApplicationReviewView({ id }: ContributorApplicationReviewViewProps) {
  const { data: application, isLoading, isError, refetch } = useAdminContributorApplication(id);
  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);

  const approveMutation = useApproveContributorApplication();
  const rejectMutation = useRejectContributorApplication();
  const revisionMutation = useRequestContributorApplicationRevision();

  if (isLoading) {
    return <LoadingScreen label="Loading application…" />;
  }

  if (isError || !application) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load this application" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const canDecide = application.status === 'pending' || application.status === 'needs_revision';
  const mutationForKind = {
    approve: approveMutation,
    reject: rejectMutation,
    revision: revisionMutation,
  } as const;
  const activeMutation = decisionKind ? mutationForKind[decisionKind] : null;

  function handleConfirmDecision(input: ContributorApplicationDecisionInput) {
    if (!decisionKind) return;
    const mutation = mutationForKind[decisionKind];
    const successMessage = {
      approve: 'Application approved.',
      reject: 'Application rejected.',
      revision: 'Revision requested.',
    }[decisionKind];

    mutation.mutate(
      { id, input },
      {
        onSuccess: () => {
          toast.success(successMessage);
          setDecisionKind(null);
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not save this decision.')),
      },
    );
  }

  return (
    <PageContainer className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <ApplicationStatusBadge status={application.status} />
        <span className="text-xs text-muted-foreground">
          Submitted {formatDate(application.submitted_at)}
          {application.reviewed_at ? ` · Reviewed ${formatDate(application.reviewed_at)}` : ''}
        </span>
      </div>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {application.full_name}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Applicant</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={application.applicant.avatar_url}
                name={application.applicant.display_name ?? application.applicant.username}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {application.applicant.display_name ?? application.applicant.username}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  @{application.applicant.username} · {application.applicant.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {application.applicant.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 font-medium">Profession</p>
                  <p className="text-muted-foreground">{application.profession}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium">Organization</p>
                  <p className="text-muted-foreground">{application.organization}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium">Country</p>
                  <p className="text-muted-foreground">{application.country}</p>
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium">Area of expertise</p>
                <p className="text-muted-foreground">{application.expertise}</p>
              </div>
              <div>
                <p className="mb-1 font-medium">Bio</p>
                <p className="whitespace-pre-line text-muted-foreground">{application.bio}</p>
              </div>
              <div>
                <p className="mb-1 font-medium">Experience</p>
                <p className="whitespace-pre-line text-muted-foreground">{application.experience}</p>
              </div>
              <div>
                <p className="mb-1 font-medium">Motivation</p>
                <p className="whitespace-pre-line text-muted-foreground">{application.motivation}</p>
              </div>
              {application.sample_works ? (
                <div>
                  <p className="mb-1 font-medium">Previous contributions</p>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {application.sample_works}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {application.sample_file_urls.length > 0 || application.supporting_document_urls.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded files</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {application.sample_file_urls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-sm text-brand hover:underline"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    Sample file {index + 1}
                  </a>
                ))}
                {application.supporting_document_urls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-sm text-brand hover:underline"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    Supporting document {index + 1}
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Portfolio links</CardTitle>
              <CardDescription>Links are shown as-is — nothing is fetched automatically.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(PROFILE_LINK_LABELS) as (keyof ProfileLinkBadges)[]).map((key) => (
                <ProfileLinkRow
                  key={key}
                  label={PROFILE_LINK_LABELS[key]}
                  badge={application.profile_links[key]}
                />
              ))}
            </CardContent>
          </Card>

          {application.review_notes || application.feedback_to_applicant ? (
            <Card>
              <CardHeader>
                <CardTitle>Review record</CardTitle>
                {application.reviewer ? (
                  <CardDescription>
                    Reviewed by {application.reviewer.display_name ?? application.reviewer.username}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {application.feedback_to_applicant ? (
                  <div>
                    <p className="mb-1 font-medium">Feedback shown to applicant</p>
                    <p className="whitespace-pre-line text-muted-foreground">
                      {application.feedback_to_applicant}
                    </p>
                  </div>
                ) : null}
                {application.review_notes ? (
                  <div>
                    <p className="mb-1 font-medium">Internal notes</p>
                    <p className="whitespace-pre-line text-muted-foreground">
                      {application.review_notes}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <ApplicationHistoryTimeline entries={application.previous_applications} linkToDetail />
        </div>

        <div className="flex flex-col gap-4">
          {canDecide ? (
            <Card>
              <CardHeader>
                <CardTitle>Decision</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button onClick={() => setDecisionKind('approve')}>
                  <ThumbsUp className="size-4" aria-hidden="true" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setDecisionKind('revision')}>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Request revision
                </Button>
                <Button variant="destructive" onClick={() => setDecisionKind('reject')}>
                  <ThumbsDown className="size-4" aria-hidden="true" />
                  Reject
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Contribution stats</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <StatRow label="Reputation score" value={application.applicant.reputation_score} />
              <StatRow label="Member since" value={formatDate(application.applicant.member_since)} />
              <StatRow
                label="Last active"
                value={
                  application.applicant.last_active
                    ? formatDate(application.applicant.last_active)
                    : 'Never'
                }
              />
              <Separator className="my-1" />
              <StatRow label="Total submitted" value={application.contribution_stats.total_submitted} />
              <StatRow label="Approved" value={application.contribution_stats.total_approved} />
              <StatRow label="Rejected" value={application.contribution_stats.total_rejected} />
              <StatRow label="Pending" value={application.contribution_stats.pending_reviews} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quality indicators</CardTitle>
              <CardDescription>Some are placeholders until automated scoring ships.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {(Object.keys(QUALITY_INDICATOR_LABELS) as (keyof typeof QUALITY_INDICATOR_LABELS)[]).map(
                (key) => {
                  const indicator = application.quality_indicators[key];
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span>{QUALITY_INDICATOR_LABELS[key]}</span>
                      {indicator.available ? (
                        <span className="font-medium tabular-nums">
                          {indicator.value}
                          {key === 'approval_rate' || key === 'profile_completeness' ? '%' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="size-3.5" aria-hidden="true" />
                          Not yet available
                        </span>
                      )}
                    </div>
                  );
                },
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ApplicationDecisionDialog
        kind={decisionKind}
        onOpenChange={(open) => {
          if (!open) setDecisionKind(null);
        }}
        isPending={activeMutation?.isPending ?? false}
        onConfirm={handleConfirmDecision}
      />
    </PageContainer>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
