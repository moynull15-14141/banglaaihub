import type { NotificationType } from '../generated/prisma/client';

// The 20-value NotificationType enum grouped into the handful of
// categories a person actually thinks in terms of — this is the single
// source of truth for both NotificationService.create()'s mute check and
// GET/PATCH /users/me/notification-preferences; the frontend renders
// whatever this list says, it does not duplicate the grouping.
export const NOTIFICATION_CATEGORIES = [
  {
    key: 'comments',
    label: 'Comments & mentions',
    description: 'Replies to your comments and @mentions.',
    types: ['comment_reply', 'mention', 'comment_removed'] satisfies NotificationType[],
  },
  {
    key: 'reviews',
    label: 'Reviews & likes',
    description: 'Reviews on your resources and likes they receive.',
    types: ['review_received', 'resource_liked', 'review_helpful', 'review_removed'] satisfies NotificationType[],
  },
  {
    key: 'submissions',
    label: 'Submissions & contributor status',
    description: 'Approval/rejection of your submissions and contributor application.',
    types: [
      'submission_approved',
      'submission_rejected',
      'contributor_application_approved',
      'contributor_application_rejected',
      'contributor_application_needs_revision',
      'contributor_application_submitted',
      'contributor_application_withdrawn',
    ] satisfies NotificationType[],
  },
  {
    key: 'milestones',
    label: 'Milestones & digests',
    description: 'Reputation milestones, level-ups, and the weekly activity digest.',
    types: ['reputation_milestone', 'weekly_digest', 'level_up', 'milestone_reached'] satisfies NotificationType[],
  },
  {
    key: 'follows',
    label: 'Follows & badges',
    description: 'New followers and badges you earn.',
    types: ['follow_received', 'badge_received'] satisfies NotificationType[],
  },
  {
    key: 'messages',
    label: 'Direct messages',
    description: 'New direct messages from other users.',
    types: ['new_message'] satisfies NotificationType[],
  },
  {
    key: 'editorial',
    label: 'Editorial workflow',
    description: 'Article assignments, reviews, and publish/schedule status.',
    types: [
      'article_assigned',
      'article_review_requested',
      'article_needs_changes',
      'article_approved',
      'article_published',
      'article_scheduled',
    ] satisfies NotificationType[],
  },
] as const;

export type NotificationCategoryKey = (typeof NOTIFICATION_CATEGORIES)[number]['key'];

// A tuple (not just string[]) so z.enum(...) can consume it directly.
export const NOTIFICATION_CATEGORY_KEYS = NOTIFICATION_CATEGORIES.map((c) => c.key) as [
  NotificationCategoryKey,
  ...NotificationCategoryKey[],
];

const TYPE_TO_CATEGORY = new Map<NotificationType, NotificationCategoryKey>(
  NOTIFICATION_CATEGORIES.flatMap((category) => category.types.map((type) => [type, category.key] as const)),
);

export function categoryKeyForType(type: NotificationType): NotificationCategoryKey | null {
  return TYPE_TO_CATEGORY.get(type) ?? null;
}
