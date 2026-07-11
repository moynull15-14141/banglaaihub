// Mirrors backend/src/services/follow.service.ts's toUserSummaryDto.
export interface FollowUserSummary {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  headline: string | null;
  is_following: boolean;
}

export interface ListFollowParams {
  page?: number;
  limit?: number;
}
