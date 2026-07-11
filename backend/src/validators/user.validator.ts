import { z } from 'zod';
import { NOTIFICATION_CATEGORY_KEYS } from '../utils/notificationCategories';

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const PROFILE_VISIBILITIES = ['public', 'private', 'followers_only'] as const;

// Only fields doc 10's User model marks as profile-editable — never role,
// permission, status, email, username, or reputation.
export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional(),
  headline: z.string().max(200).optional(),
  institution: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  website_url: z.string().url().optional(),
  github_url: z.string().url().optional(),
  gitlab_url: z.string().url().optional(),
  scholar_url: z.string().url().optional(),
  kaggle_url: z.string().url().optional(),
  huggingface_url: z.string().url().optional(),
  linkedin_url: z.string().url().optional(),
  orcid_id: z.string().regex(ORCID_REGEX, 'ORCID must look like 0000-0002-1825-0097').optional(),
  x_url: z.string().url().optional(),
  research_interests: z.array(z.string().max(100)).max(20).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  visibility: z.enum(PROFILE_VISIBILITIES).optional(),
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

// --- Phase 4B ----------------------------------------------------------------

export const pinResourceSchema = z.object({
  resource_id: z.string().uuid(),
});
export type PinResourceInput = z.infer<typeof pinResourceSchema>;

export const reorderPinnedResourcesSchema = z.object({
  resource_ids: z.array(z.string().uuid()).max(6),
});
export type ReorderPinnedResourcesInput = z.infer<typeof reorderPinnedResourcesSchema>;

export const listActivityQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;

export const heatmapQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
});
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;

export const updateNotificationPreferenceSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORY_KEYS),
  enabled: z.boolean(),
});
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

const USER_SEARCH_SORTS = ['newest', 'oldest'] as const;
export const searchUsersQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  verified: z.literal('true').optional(),
  contributor_level: z.string().optional(),
  skills: z
    .string()
    .transform((value) => value.split(',').map((s) => s.trim()).filter(Boolean))
    .optional(),
  research_interest: z.string().optional(),
  sort: z.enum(USER_SEARCH_SORTS).optional(),
});
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
