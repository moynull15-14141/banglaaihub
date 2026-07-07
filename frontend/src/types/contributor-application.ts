export type ContributorApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_revision'
  | 'withdrawn';

export interface ProfileLinkFields {
  github_url?: string;
  kaggle_url?: string;
  huggingface_url?: string;
  scholar_url?: string;
  linkedin_url?: string;
  website_url?: string;
  orcid_id?: string;
  x_url?: string;
}

export interface ProfileLinkBadge {
  url: string | null;
  connected: boolean;
}

export type ProfileLinkBadges = Record<
  | 'github_url'
  | 'kaggle_url'
  | 'huggingface_url'
  | 'scholar_url'
  | 'linkedin_url'
  | 'website_url'
  | 'orcid_id'
  | 'x_url',
  ProfileLinkBadge
>;

export interface SubmitContributorApplicationInput extends ProfileLinkFields {
  full_name: string;
  profession: string;
  organization: string;
  country: string;
  bio: string;
  expertise: string;
  experience: string;
  motivation: string;
  sample_works?: string;
}

export type UpdateContributorApplicationInput = Partial<SubmitContributorApplicationInput>;

// Shared by an applicant's own history and the admin detail view.
// `review_notes`/`reviewer` are only ever populated on the admin-facing shape.
export interface ContributorApplicationHistoryEntry {
  id: string;
  status: ContributorApplicationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  feedback_to_applicant: string | null;
  review_notes?: string | null;
  reviewer?: { id: string; username: string; display_name: string | null } | null;
}

// Applicant-facing shape — never includes review_notes or reviewer identity.
export interface MyContributorApplication {
  id: string;
  status: ContributorApplicationStatus;
  full_name: string;
  profession: string;
  organization: string;
  country: string;
  bio: string;
  expertise: string;
  experience: string;
  motivation: string;
  sample_works: string | null;
  sample_file_urls: string[];
  supporting_document_urls: string[];
  profile_links: ProfileLinkBadges;
  feedback_to_applicant: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  previous_applications: ContributorApplicationHistoryEntry[];
}

export interface ContributorApplicationListItem {
  id: string;
  status: ContributorApplicationStatus;
  full_name: string;
  expertise: string;
  submitted_at: string;
  reviewed_at: string | null;
  applicant: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface QualityIndicator {
  value: number | null;
  available: boolean;
}

export interface ContributionStats {
  total_submitted: number;
  total_approved: number;
  total_rejected: number;
  pending_reviews: number;
  approval_rate: number | null;
}

export interface QualityIndicators {
  approval_rate: QualityIndicator;
  profile_completeness: QualityIndicator;
  resource_diversity: QualityIndicator;
  contribution_quality_score: QualityIndicator;
  documentation_quality: QualityIndicator;
  metadata_quality: QualityIndicator;
  license_compliance: QualityIndicator;
}

// Admin-facing detail shape — includes internal review_notes and reviewer info.
export interface ContributorApplicationAdminDetail {
  id: string;
  status: ContributorApplicationStatus;
  full_name: string;
  profession: string;
  organization: string;
  country: string;
  bio: string;
  expertise: string;
  experience: string;
  motivation: string;
  sample_works: string | null;
  sample_file_urls: string[];
  supporting_document_urls: string[];
  profile_links: ProfileLinkBadges;
  previous_applications: ContributorApplicationHistoryEntry[];
  review_notes: string | null;
  feedback_to_applicant: string | null;
  reviewer: { id: string; username: string; display_name: string | null } | null;
  reviewed_at: string | null;
  submitted_at: string;
  applicant: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
    roles: string[];
    reputation_score: number;
    member_since: string;
    last_active: string | null;
  };
  contribution_stats: ContributionStats;
  quality_indicators: QualityIndicators;
}

export interface ContributorApplicationDecisionInput {
  feedback?: string;
  notes?: string;
}
