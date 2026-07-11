// Mirrors backend/src/services/activity.service.ts's toActivityDto.
export type ActivityType =
  | 'resource_uploaded'
  | 'resource_approved'
  | 'review_written'
  | 'review_received'
  | 'comment_added'
  | 'reply_added'
  | 'badge_received'
  | 'level_up'
  | 'started_following'
  | 'prompt_forked'
  | 'model_uploaded'
  | 'like_received'
  | 'milestone_reached';

export interface Activity {
  id: string;
  type: ActivityType;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ListActivityParams {
  page?: number;
  limit?: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface Heatmap {
  year: number;
  total_contributions: number;
  days: HeatmapDay[];
  current_streak: number;
  longest_streak: number;
}
