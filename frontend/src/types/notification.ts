// Mirrors backend/prisma/schema.prisma's NotificationType enum.
export type NotificationType =
  | 'submission_approved'
  | 'submission_rejected'
  | 'comment_reply'
  | 'mention'
  | 'reputation_milestone'
  | 'weekly_digest'
  | 'contributor_application_approved'
  | 'contributor_application_rejected'
  | 'contributor_application_needs_revision'
  | 'contributor_application_submitted'
  | 'contributor_application_withdrawn'
  | 'review_received'
  | 'resource_liked'
  | 'review_helpful'
  | 'review_removed'
  | 'comment_removed'
  | 'follow_received'
  | 'badge_received'
  | 'level_up'
  | 'milestone_reached';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unread?: true;
}
