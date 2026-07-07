import { z } from 'zod';

const APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'needs_revision',
  'withdrawn',
] as const;

// e.g. 0000-0002-1825-0097 — the last group's final character may be 'X'.
const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// Reused by submit + update — profile links live on User (see users.service.ts)
// but are collected here too since the application form is where most
// applicants will set them for the first time.
const profileLinksSchema = z.object({
  github_url: z.string().url().optional(),
  kaggle_url: z.string().url().optional(),
  huggingface_url: z.string().url().optional(),
  scholar_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  website_url: z.string().url().optional(), // personal website / portfolio
  orcid_id: z.string().regex(ORCID_REGEX, 'ORCID must look like 0000-0002-1825-0097').optional(),
  x_url: z.string().url().optional(),
});

export const submitContributorApplicationSchema = z
  .object({
    full_name: z.string().min(2).max(150).trim(),
    profession: z.string().min(2).max(150).trim(),
    organization: z.string().min(2).max(150).trim(),
    country: z.string().min(2).max(100).trim(),
    bio: z.string().min(50).max(2000).trim(),
    expertise: z.string().min(2).max(300).trim(),
    experience: z.string().min(50).max(3000).trim(),
    motivation: z.string().min(50).max(2000).trim(),
    // Labeled "Previous contributions" on the form — kept as `sample_works`
    // here since it's the same underlying field, just relabeled for clarity.
    sample_works: z.string().max(3000).trim().optional(),
  })
  .merge(profileLinksSchema);
export type SubmitContributorApplicationInput = z.infer<typeof submitContributorApplicationSchema>;

export const updateContributorApplicationSchema = submitContributorApplicationSchema.partial();
export type UpdateContributorApplicationInput = z.infer<typeof updateContributorApplicationSchema>;

export const addSampleFileQuerySchema = z.object({
  kind: z.enum(['sample', 'supporting']).default('sample'),
});
export type AddSampleFileQuery = z.infer<typeof addSampleFileQuerySchema>;

export const listContributorApplicationsQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  // Free-text — there's no controlled vocabulary for any of these (applicants
  // type them in on the form), so they're matched case-insensitively.
  search: z.string().trim().max(200).optional(),
  country: z.string().trim().max(100).optional(),
  profession: z.string().trim().max(150).optional(),
  organization: z.string().trim().max(150).optional(),
  expertise: z.string().trim().max(300).optional(),
});
export type ListContributorApplicationsQuery = z.infer<
  typeof listContributorApplicationsQuerySchema
>;

// Shared by approve/reject/request-revision — `feedback` is applicant-visible,
// `notes` is internal-only (never returned by the applicant-facing endpoints).
export const contributorApplicationDecisionSchema = z.object({
  feedback: z.string().max(2000).trim().optional(),
  notes: z.string().max(2000).trim().optional(),
});
export type ContributorApplicationDecisionInput = z.infer<
  typeof contributorApplicationDecisionSchema
>;
