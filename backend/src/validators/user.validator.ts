import { z } from 'zod';

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

// Only fields doc 10's User model marks as profile-editable — never role,
// permission, status, email, username, or reputation.
export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional(),
  institution: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  website_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  scholar_url: z.string().url().optional(),
  kaggle_url: z.string().url().optional(),
  huggingface_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  orcid_id: z.string().regex(ORCID_REGEX, 'ORCID must look like 0000-0002-1825-0097').optional(),
  x_url: z.string().url().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const addBookmarkSchema = z.object({
  resource_id: z.string().uuid(),
});
export type AddBookmarkInput = z.infer<typeof addBookmarkSchema>;

const SUBMISSION_STATUS_FILTERS = ['draft', 'pending', 'published', 'rejected'] as const;

export const listSubmissionsQuerySchema = z.object({
  status: z.enum(SUBMISSION_STATUS_FILTERS).optional(),
});
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
